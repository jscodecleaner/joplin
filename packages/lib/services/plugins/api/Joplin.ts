import Plugin from '../Plugin';
import JoplinData from './JoplinData';
import JoplinPlugins from './JoplinPlugins';
import JoplinWorkspace from './JoplinWorkspace';
import JoplinFilters from './JoplinFilters';
import JoplinCommands from './JoplinCommands';
import JoplinViews from './JoplinViews';
import JoplinInterop from './JoplinInterop';
import JoplinSettings from './JoplinSettings';
import JoplinContentScripts from './JoplinContentScripts';
import JoplinClipboard from './JoplinClipboard';
import JoplinWindow from './JoplinWindow';

/**
 * This is the main entry point to the Joplin API. You can access various services using the provided accessors.
 *
 * The API is now relatively stable and in general maintaining backward compatibility is a top priority, so you shouldn't except much breakages.
 *
 * If a breaking change ever becomes needed, best effort will be done to:
 *
 * - Deprecate features instead of removing them, so as to give you time to fix the issue;
 * - Document breaking changes in the changelog;
 *
 * So if you are developing a plugin, please keep an eye on the changelog as everything will be in there with information about how to update your code.
 */
export default class Joplin {

	private data_: JoplinData = null;
	private plugins_: JoplinPlugins = null;
	private workspace_: JoplinWorkspace = null;
	private filters_: JoplinFilters = null;
	private commands_: JoplinCommands = null;
	private views_: JoplinViews = null;
	private interop_: JoplinInterop = null;
	private settings_: JoplinSettings = null;
	private contentScripts_: JoplinContentScripts = null;
	private clipboard_: JoplinClipboard = null;
	private window_: JoplinWindow = null;

	public constructor(implementation: any, plugin: Plugin, store: any) {
		this.data_ = new JoplinData();
		this.plugins_ = new JoplinPlugins(plugin);
		this.workspace_ = new JoplinWorkspace(store);
		this.filters_ = new JoplinFilters();
		this.commands_ = new JoplinCommands();
		this.views_ = new JoplinViews(implementation.joplin.views, plugin, store);
		this.interop_ = new JoplinInterop();
		this.settings_ = new JoplinSettings(plugin);
		this.contentScripts_ = new JoplinContentScripts(plugin);
		this.clipboard_ = new JoplinClipboard(implementation.clipboard, implementation.nativeImage);
		this.window_ = new JoplinWindow(implementation.window, plugin, store);
	}

	public get data(): JoplinData {
		return this.data_;
	}

	public get clipboard(): JoplinClipboard {
		return this.clipboard_;
	}

	public get window(): JoplinWindow {
		return this.window_;
	}

	public get plugins(): JoplinPlugins {
		return this.plugins_;
	}

	public get workspace(): JoplinWorkspace {
		return this.workspace_;
	}

	public get contentScripts(): JoplinContentScripts {
		return this.contentScripts_;
	}

	/**
	 * @ignore
	 *
	 * Not sure if it's the best way to hook into the app
	 * so for now disable filters.
	 */
	public get filters(): JoplinFilters {
		return this.filters_;
	}

	public get commands(): JoplinCommands {
		return this.commands_;
	}

	public get views(): JoplinViews {
		return this.views_;
	}

	public get interop(): JoplinInterop {
		return this.interop_;
	}

	public get settings(): JoplinSettings {
		return this.settings_;
	}

	/**
	 * It is not possible to bundle native packages with a plugin, because they
	 * need to work cross-platforms. Instead access to certain useful native
	 * packages is provided using this function.
	 *
	 * Currently these packages are available:
	 *
	 * - [sqlite3](https://www.npmjs.com/package/sqlite3)
	 * - [fs-extra](https://www.npmjs.com/package/fs-extra)
	 *
	 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/nativeModule)
	 */
	public require(_path: string): any {
		// Just a stub. Implementation has to be done within plugin process, in plugin_index.js
	}

}
