import {App, Editor, MarkdownView, Modal, Notice, Plugin, FileView, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, XmpEditorPluginSettings, XmpEditorPluginSettingTab} from "./settings";
import {jpgReadXmp} from "../lib/xmp-api.js";
import { readImageMetadata } from "./metadata";

export default class XmpEditorPlugin extends Plugin {
	settings: XmpEditorPluginSettings;


	async onload() {
		console.log("XMP Editor Plugin Loaded");

		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		this.registerEvent(
			this.app.workspace.on('file-open', this.onFileOpen.bind(this))
		);
/* 
		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
 */
	}

	onunload() {
		console.log("XMP Editor Plugin Unloaded!");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<XmpEditorPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async onFileOpen() {
		const file = this.app.workspace.getActiveFile();

		if (!file) return;

		if (file.extension == 'jpg') {
			await this.addControls(file);
		}
	}

	private async addControls(file: TFile) {
		const view = this.app.workspace.getActiveViewOfType(FileView);
		
		if (!view) return;
		
		const viewContent = view.contentEl;
		
		if (!viewContent) return;
		
		const buffer = await this.app.vault.readBinary(file);
		const xmpPacket = jpgReadXmp(buffer);

		const test = await readImageMetadata(buffer, file.name);

		const titleInput = this.addInputControl(viewContent, "Title", test.title?.valueOf() ?? "");

		titleInput.addEventListener('change', () => {
			let title = titleInput.value;

			console.log(title);
		});
	}

    private addInputControl(viewContent: Element, inputTitle: string, inputText: string){
		const book = viewContent.createEl('div', { cls: 'book' });
		book.createEl('div', { text: 'How to Take Smart Notes', cls: 'book__title' });
		book.createEl('small', { text: 'Sönke Ahrens', cls: 'book__author' });
		
		const div = book.createDiv({
            cls: 'xmp-metadata__tag-name',
            text: inputTitle
        });

		const inputControl = book.createEl('textarea', {
            cls: 'xmp-metadata__tag-value',
            text: inputText
        });

        return inputControl;
    }	
}
/* 
class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
 */