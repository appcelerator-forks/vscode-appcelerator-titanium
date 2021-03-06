import { KeystoreInfo, LogLevel, Platform, WindowsCertInfo } from './common';

export interface BaseCLIOptions {
	logLevel: LogLevel;
}

export interface BaseBuildOptions extends BaseCLIOptions {
	buildOnly: boolean;
	buildType: string;
	platform: Platform;
	projectDir: string;
	projectType: 'app' | 'module';
}

export interface BuildAppBase extends BaseBuildOptions {
	deviceId?: string;
	deviceLabel?: string;
	liveview: boolean;
	target: string;
	debugPort?: number;
	skipJsMinify?: boolean;
	sourceMaps?: boolean;
	sdkVersion?: string;
	deployType?: string;
}

export interface BuildAndroidAppOptions extends BuildAppBase {
	keystore?: string;
}

export interface BuildIosAppOptions extends BuildAppBase {
	iOSCertificate?: string;
	iOSProvisioningProfile?: string;
}

export interface BuildWindowsAppOptions extends BuildAppBase {
	windowsCertInfo?: WindowsCertInfo;
	windowsPublisherID?: string;
}

export type BuildAppOptions = BuildAndroidAppOptions | BuildIosAppOptions | BuildWindowsAppOptions;

export interface BuildModuleOptions extends BaseBuildOptions {
	outputDirectory?: string;
}

export interface BasePackageOptions extends BaseCLIOptions {
	outputDirectory: string;
	platform: Platform;
	projectDir: string;
	target: string;
}

export interface AndroidPackageOptions extends BasePackageOptions {
	keystoreInfo: KeystoreInfo;
}

export interface IosPackageOptions extends BasePackageOptions {
	iOSCertificate: string;
	iOSProvisioningProfile: string;
}

export interface WindowsPackageOptions extends BasePackageOptions {
	windowsCertInfo: WindowsCertInfo;
	windowsPublisherID?: string;
}

export type PackageAppOptions = AndroidPackageOptions | IosPackageOptions | WindowsPackageOptions;

export interface CreateOptions extends BaseCLIOptions {
	id: string;
	force: boolean;
	name: string;
	platforms: string[];
	workspaceDir: string;
}

export interface CreateAppOptions extends CreateOptions {
	enableServices: boolean;
}

export interface CreateModuleOptions extends CreateOptions {
	codeBase?: 'swift' | 'objc';
}

export interface CleanAppOptions extends BaseCLIOptions {
	projectDir: string;
}
