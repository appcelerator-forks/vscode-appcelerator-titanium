
import * as path from 'path';
import { completion } from 'titanium-editor-commons';
import project from '../../project';
import * as related from '../../related';
import * as utils from '../../utils';
import * as alloyAutoCompleteRules from './alloyAutoCompleteRules';

import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, Position, Range, SnippetString, TextDocument, workspace } from 'vscode';

/**
 * Alloy Controller completion provider
 */
export class ControllerCompletionItemProvider implements CompletionItemProvider {

	private completions: any;
	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 * @param {CancellationToken} token cancellation token
	 * @param {CompletionContext} context context for completion request
	 *
	 * @returns {Thenable|Array}
	 */
	public async provideCompletionItems (document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[]> {
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));

		if (!this.completions) {
			await this.loadCompletions();
		}

		// Alloy XML ID - $._
		if (/\$\.([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getIdCompletions();
		// Alloy XML ID property or function - $.tableView._
		} else if (/\$\.([-a-zA-Z0-9-_]*).([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getMethodAndPropertyCompletions(linePrefix);
		// Titanium APIs - Ti.UI._ or Ti._
		} else if (/(?:Ti|Titanium)\.?\S+/i.test(linePrefix)) {
			return this.getTitaniumApiCompletions(linePrefix);
		// Event name - $.tableView.addEventListener('click', ...)
		} else if (/\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			return this.getEventNameCompletions(linePrefix);
		// require('')
		} else if (/require\(["']?([^'");]*)["']?\)?$/.test(linePrefix)) {
			const matches = linePrefix.match(/require\(["']?([^'");]*)["']?\)?$/)!;
			const requestedModule = matches[1];
			const range = document.getWordRangeAtPosition(position, /([\w/.$]+)/);
			return this.getFileCompletions('lib', requestedModule, range);
		// Alloy.createController('')
		} else if (/Alloy\.(createController|Controllers\.instance)\(["']([-a-zA-Z0-9-_/]*["']?\)?)$/.test(linePrefix)) {
			return this.getFileCompletions('controllers');
		// Alloy.createModel('')
		} else if (/Alloy\.(createModel|Models\.instance|createCollection|Collections\.instance)\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			return this.getFileCompletions('models');
		// Alloy.createWidget('')
		} else if (/Alloy\.(createWidget|Widgets\.instance)\(["']([-a-zA-Z0-9-_/.]*)$/.test(linePrefix)) {
			return this.getWidgetCompletions();
			// Alloy APIs - Alloy._
		} else if (/(?:Alloy)\.?\S+/.test(linePrefix)) {
			return this.getAlloyApiCompletions(linePrefix);
		} else {
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					if (rule.requireRange) {
						const range = document.getWordRangeAtPosition(position, rule.rangeRegex);
						return await rule.getCompletions(range);
					}

					return await rule.getCompletions();
				}
			}
		}

		return [ { label: 'Ti', kind: CompletionItemKind.Class } ];
	}

	/**
	 * Get ID completions
	 *
	 * @returns {Thenable}
	 */
	public async getIdCompletions (): Promise<CompletionItem[]> {
		const completions: CompletionItem[] = [];
		const relatedFile = related.getTargetPath('xml');
		if (!relatedFile) {
			return completions;
		}
		const fileName = relatedFile.split('/').pop();
		const document = await workspace.openTextDocument(relatedFile);
		const regex = /id="(.+?)"/g;
		const ids: string[] = [];
		for (let matches = regex.exec(document.getText()); matches !== null; matches = regex.exec(document.getText())) {
			const id = matches[1];
			if (!ids.includes(id)) {
				completions.push({
					label: id,
					kind: CompletionItemKind.Reference,
					detail: fileName
				});
				ids.push(id);
			}
		}
		return completions;
	}

	/**
	 * Get controller member method and properties completions
	 *
	 * @param {String} linePrefix line prefix text
	 *
	 * @returns {Thenable}
	 */
	public async getMethodAndPropertyCompletions (linePrefix: string): Promise<CompletionItem[]> {
		const { tags } = this.completions.alloy;
		const { types } = this.completions.titanium;

		const id = linePrefix.match(/\$\.([-a-zA-Z0-9-_]*)\.?$/)![1];
		const completions: CompletionItem[] = [];
		const relatedFile = related.getTargetPath('xml');
		if (!relatedFile) {
			return completions;
		}
		const document = await workspace.openTextDocument(relatedFile);
		let tagName;
		const regex = new RegExp(`id=["']${id}["']`, 'g');
		const ids = regex.exec(document.getText());
		if (ids) {
			const position = document.positionAt(ids.index);
			const closestId = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
			if (closestId) {
				tagName = closestId[1];
			}
		}

		if (tagName && tags[tagName]) {
			const { apiName } = tags[tagName];
			const tagObj = types[apiName];
			if (tagObj) {
				for (const value of tagObj.functions) {
					completions.push({
						label: value,
						kind: CompletionItemKind.Method,
						insertText: new SnippetString(`${value}($1)$0`)
					});
				}

				for (const value of tagObj.properties) {
					completions.push({
						label: value,
						kind: CompletionItemKind.Property,
						insertText: new SnippetString(`${value} = $1$0`)
					});
				}
			}
		}
		return completions;
	}

	/**
	 * Get Titanium API completions
	 *
	 * @param {String} linePrefix line prefix text
	 *
	 * @returns {Array}
	 */
	public getTitaniumApiCompletions (linePrefix: string): CompletionItem[] {
		const { types } = this.completions.titanium;
		const matches = linePrefix.match(/(Ti\.(?:(?:[A-Z]\w*|iOS|iPad)\.?)*)([a-z]\w*)*$/);
		const completions: CompletionItem[] = [];
		let apiName: string|undefined;
		let attribute: string|undefined;
		if (matches && matches.length === 3) {
			apiName = matches[1];
			if (apiName.lastIndexOf('.') === apiName.length - 1) {
				apiName = apiName.substr(0, apiName.length - 1);
			}
			attribute = matches[2];
		}

		if (attribute && ('iOS'.indexOf(attribute) === 0 || 'iPad'.indexOf(attribute) === 0)) {
			apiName += '.' + attribute;
			attribute = undefined;
		}

		if (!apiName) {
			return completions;
		}

		// suggest class completion
		if (!attribute || attribute.length === 0) {
			for (const key of Object.keys(types)) {
				if (key.indexOf(apiName) === 0 && key.indexOf('_') === -1) {
					const replaceSections = key.split('.');
					completions.push({
						label: key,
						kind: CompletionItemKind.Class,
						insertText: replaceSections[replaceSections.length - 1]
					});
				}
			}
		}

		// if type exists suggest function and properties
		const apiObj = types[apiName];
		if (apiObj) {
			for (const func of apiObj.functions) {
				if ((!attribute || utils.matches(func, attribute)) && func.indexOf('deprecated') === -1) {
					completions.push({
						label: func,
						kind: CompletionItemKind.Method
					});
				}
			}
			for (const property of apiObj.properties) {
				if ((!attribute || utils.matches(property, attribute)) && property.indexOf('deprecated') === -1) {
					completions.push({
						label: property,
						kind: CompletionItemKind.Property
					});
				}
			}
		}

		return completions;
	}

	/**
	 * Get Alloy API completions
	 *
	 * @param {String} linePrefix line prefix text
	 *
	 * @returns {Array}
	 */
	public getAlloyApiCompletions (linePrefix: string): CompletionItem[] {
		const { types } = this.completions.alloy;
		const matches = linePrefix.match(/(Alloy\.(?:(?:[A-Z]\w*)\.?)*)([a-z]\w*)*$/);
		const completions: CompletionItem[] = [];

		let apiName: string|undefined;
		let attribute: string|undefined;
		if (matches && matches.length === 3) {
			apiName = matches[1];
			if (apiName.lastIndexOf('.') === apiName.length - 1) {
				apiName = apiName.substr(0, apiName.length - 1);
			}
			attribute = matches[2];
		}

		if (!apiName) {
			return completions;
		}

		// suggest class completion
		if (!attribute || attribute.length === 0) {
			for (const key of Object.keys(types)) {
				if (key.indexOf(apiName) === 0 && key.indexOf('_') === -1) {
					const replaceSections = key.split('.');
					completions.push({
						label: key,
						kind: CompletionItemKind.Class,
						insertText: replaceSections[replaceSections.length - 1]
					});
				}
			}
		}

		// if type exists suggest function and properties
		const apiObj = types[apiName];
		if (apiObj) {
			for (const func of apiObj.functions) {
				if ((!attribute || utils.matches(func, attribute)) && func.indexOf('deprecated') === -1) {
					completions.push({
						label: func,
						kind: CompletionItemKind.Method
					});
				}
			}
			for (const property of apiObj.properties) {
				if ((!attribute || utils.matches(property, attribute)) && property.indexOf('deprecated') === -1) {
					completions.push({
						label: property,
						kind: CompletionItemKind.Property
					});
				}
			}
		}

		return completions;
	}

	/**
	 * Get event name completions
	 *
	 * @param {String} linePrefix line prefix text
	 *
	 * @returns {Thenable}
	 */
	public async getEventNameCompletions (linePrefix: string): Promise<CompletionItem[]> {
		const { tags } = this.completions.alloy;
		const { types } = this.completions.titanium;
		const matches = /\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.exec(linePrefix);
		const completions: CompletionItem[] = [];

		if (!matches) {
			return completions;
		}
		const id = matches[1];
		const relatedFile = related.getTargetPath('xml');
		if (!relatedFile) {
			return completions;
		}
		const document = await workspace.openTextDocument(relatedFile);
		let tagName;
		const regex = new RegExp(`id=["']${id}["']`, 'g');
		const ids = regex.exec(document.getText());
		if (ids) {
			const position = document.positionAt(ids.index);
			const closestId = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
			if (closestId) {
				tagName = matches[1];
			}
		}

		if (tagName && tags[tagName]) {
			const { apiName } = tags[tagName];
			const tagObj = types[apiName];
			for (const event of tagObj.events) {
				completions.push({
					label: event,
					kind: CompletionItemKind.Event,
					detail: apiName
				});
			}
		}
		return completions;
	}

	/**
	 * Get js file completions. Used to return controller, model and require references.
	 *
	 * @param {String} directory alloy directory
	 * @param {String} moduleName name of the module
	 *
	 * @returns {Thenable}
	 */
	public getFileCompletions(directory: string, moduleName?: string, range?: Range): CompletionItem[] {
		const completions: CompletionItem[] = [];
		const filesPath = path.join(utils.getAlloyRootPath(), directory);
		if (moduleName && moduleName.startsWith('/')) {
			moduleName = moduleName.substring(0);
		}
		if (utils.directoryExists(filesPath)) {
			const files = utils.filterJSFiles(filesPath);

			for (const file of files) {
				const value = `/${path.posix.relative(filesPath, file.path).replace('.js', '')}`;
				const completionItem: CompletionItem = {
					label: value,
					kind: CompletionItemKind.Reference
				};
				if (range) {
					completionItem.range = range;
				}
				completions.push(completionItem);
			}
		}
		return completions;
	}

	/**
	 * Get Widget completions
	 *
	 * @returns {Thenable}
	 */
	public async getWidgetCompletions (): Promise<CompletionItem[]> {
		const completions = [];
		const alloyConfigPath = path.join(utils.getAlloyRootPath(), 'config.json');
		const document = await workspace.openTextDocument(alloyConfigPath);
		const configObj = JSON.parse(document.getText());
		const dependencies = configObj.dependencies || {};
		for (const widgetName of Object.keys(dependencies)) {
			completions.push({
				label: widgetName,
				kind: CompletionItemKind.Reference
			});
		}
		return completions;
	}

	public async loadCompletions (): Promise<void> {
		const sdk = project.sdk()[0];
		this.completions = await completion.loadCompletions(sdk, completion.CompletionsFormat.v2);
	}
}
