import {App, PluginSettingTab, Setting} from "obsidian";
import XmpEditorPlugin from "./main";

export interface XmpEditorPluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: XmpEditorPluginSettings = {
	mySetting: 'default'
}

export class XmpEditorPluginSettingTab extends PluginSettingTab {
	plugin: XmpEditorPlugin;

	constructor(app: App, plugin: XmpEditorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
