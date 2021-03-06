/* eslint no-template-curly-in-string: off */
import { expect } from 'chai';
import * as fs from 'fs';
import { after, before, describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import * as tce from 'titanium-editor-commons';
import * as vscode from 'vscode';
import project from '../../project';

import { StyleCompletionItemProvider } from '../../providers/completion/styleCompletionItemProvider';

const fixturesPath = path.join(__dirname, '../../..', 'src', 'test', 'suite', 'fixtures');
const file = path.join(fixturesPath, 'sample.tss');
const uri = vscode.Uri.file(file);
const rawData = fs.readFileSync(path.join(fixturesPath, 'data', 'completions.json'), 'utf8');
const completions = JSON.parse(rawData);

async function testCompletion (position: vscode.Position): Promise<vscode.CompletionItem[]> {
	const text = await vscode.workspace.openTextDocument(uri);
	const provider = new StyleCompletionItemProvider();
	const context: vscode.CompletionContext = {
		triggerKind: vscode.CompletionTriggerKind.Invoke,
	};
	const cancellationToken = new vscode.CancellationTokenSource();
	return provider.provideCompletionItems(text, position, cancellationToken.token, context);
}
let sandbox: sinon.SinonSandbox;

describe('TSS Suggestions', () => {

	before(async function () {
		this.timeout(5000);
		sandbox = sinon.createSandbox();
		sandbox.stub(project, 'sdk').returns([ '8.1.0.GA' ]);
		sandbox.stub(tce.completion, 'loadCompletions').resolves(completions);
	});

	after(async function () {
		this.timeout(5000);
		sandbox.restore();

	});

	it('Should provide tag suggestions', async () => {
		const position = new vscode.Position(17, 1); // "W
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(29);

		expect(suggestions[0].label).to.equal('ActionView');
		expect(suggestions[0].detail).to.equal('_ProxyProperty.ActionView');
		expect(suggestions[0].insertText).to.be.an.instanceOf(vscode.SnippetString);
		expect((suggestions[0].insertText as vscode.SnippetString).value).to.equal('ActionView": {\n\t${1}\t\n}');

		expect(suggestions[1].label).to.equal('AndroidView');
		expect(suggestions[1].detail).to.equal('Ti.UI.AndroidView');
		expect((suggestions[1].insertText as vscode.SnippetString).value).to.equal('AndroidView": {\n\t${1}\t\n}');

		expect(suggestions[2].label).to.equal('CardView');
		expect(suggestions[2].detail).to.equal('Ti.UI.Android.CardView');
		expect((suggestions[2].insertText as vscode.SnippetString).value).to.equal('CardView": {\n\t${1}\t\n}');

		expect(suggestions[3].label).to.equal('CenterView');
		expect(suggestions[3].detail).to.equal('Ti.UI.Android.DrawerLayout.CenterView');
		expect((suggestions[3].insertText as vscode.SnippetString).value).to.equal('CenterView": {\n\t${1}\t\n}');

	});

	it('Should provide property name suggestions', async () => {
		const position = new vscode.Position(20, 8); // scroll
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(14);

		expect(suggestions[0].label).to.equal('autoAdjustScrollViewInsets');
		expect(suggestions[0].kind).to.equal(9);
		expect(suggestions[0].insertText).to.equal('autoAdjustScrollViewInsets: ');

		expect(suggestions[1].label).to.equal('canScroll');
		expect(suggestions[1].kind).to.equal(9);
		expect(suggestions[1].insertText).to.equal('canScroll: ');

		expect(suggestions[2].label).to.equal('fastScroll');
		expect(suggestions[2].kind).to.equal(9);
		expect(suggestions[2].insertText).to.equal('fastScroll: ');

		expect(suggestions[3].label).to.equal('hidesSearchBarWhenScrolling');
		expect(suggestions[3].kind).to.equal(9);
		expect(suggestions[3].insertText).to.equal('hidesSearchBarWhenScrolling: ');

	});

	it('Should provide property value suggestions if Position is  at colon', async () => {
		const position = new vscode.Position(14, 16); // separatorStyle:^
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('Ti.UI.TABLE_VIEW_SEPARATOR_STYLE_NONE');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('Ti.UI.TABLE_VIEW_SEPARATOR_STYLE_SINGLE_LINE');
		expect(suggestions[1].kind).to.equal(11);

	});

	it('Should not provide property value suggestions if Position is in property', async () => {
		const position = new vscode.Position(14, 15); // separatorStyl^e:
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(0);

	});

	it('should provide color values with quotes', async () => {
		const position = new vscode.Position(7, 10); // color: "ma"
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('\'magenta\'');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('\'maroon\'');
		expect(suggestions[1].kind).to.equal(11);

	});

	it('should provide color values without quotes', async () => {
		const position = new vscode.Position(1, 19); // backgroundColor: ma
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('\'magenta\'');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('\'maroon\'');
		expect(suggestions[1].kind).to.equal(11);

	});

	it('should provide layout values', async () => {
		const position = new vscode.Position(21, 9); // layout:
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(3);

		expect(suggestions[0].label).to.equal('\'vertical\'');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('\'horizontal\'');
		expect(suggestions[1].kind).to.equal(11);

		expect(suggestions[2].label).to.equal('\'composite\'');
		expect(suggestions[2].kind).to.equal(11);

	});
});
