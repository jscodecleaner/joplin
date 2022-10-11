const React = require('react');
import { useMemo, useEffect, useCallback } from 'react';
const { Easing, Animated, TouchableOpacity, Text, StyleSheet, ScrollView, View, Alert, Image } = require('react-native');
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
import Folder from '@joplin/lib/models/Folder';
import Synchronizer from '@joplin/lib/Synchronizer';
import NavService from '@joplin/lib/services/NavService';
import { _ } from '@joplin/lib/locale';
const { themeStyle } = require('./global-style.js');
const shared = require('@joplin/lib/components/shared/side-menu-shared.js');
import { FolderEntity, FolderIcon } from '@joplin/lib/services/database/types';
import { AppState } from '../utils/types';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';

Icon.loadFont();

interface Props {
	syncStarted: boolean;
	themeId: number;
	dispatch: Function;
	collapsedFolderIds: string[];
	syncReport: any;
	decryptionWorker: any;
	resourceFetcher: any;
	syncOnlyOverWifi: boolean;
	isOnMobileData: boolean;
	notesParentType: string;
	folders: FolderEntity[];
	opacity: number;
}

const syncIconRotationValue = new Animated.Value(0);

const syncIconRotation = syncIconRotationValue.interpolate({
	inputRange: [0, 1],
	outputRange: ['0deg', '360deg'],
});

let syncIconAnimation: any;

const SideMenuContentComponent = (props: Props) => {
	const alwaysShowFolderIcons = useMemo(() => Folder.shouldShowFolderIcons(props.folders), [props.folders]);

	const styles_ = useMemo(() => {
		const theme = themeStyle(props.themeId);

		const styles: any = {
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			button: {
				flex: 1,
				flexDirection: 'row',
				height: 36,
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			buttonText: {
				flex: 1,
				color: theme.color,
				paddingLeft: 10,
				fontSize: theme.fontSize,
			},
			syncStatus: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				flex: 0,
			},
			sidebarIcon: {
				fontSize: 22,
				color: theme.color,
			},
		};

		styles.folderButton = Object.assign({}, styles.button);
		styles.folderButton.paddingLeft = 0;
		styles.folderButtonText = Object.assign({}, styles.buttonText, { paddingLeft: 0 });
		styles.folderButtonSelected = Object.assign({}, styles.folderButton);
		styles.folderButtonSelected.backgroundColor = theme.selectedColor;
		styles.folderIcon = Object.assign({}, theme.icon);
		styles.folderIcon.color = theme.colorFaded; // '#0072d5';
		styles.folderIcon.paddingTop = 3;

		styles.sideButton = Object.assign({}, styles.button, { flex: 0 });
		styles.sideButtonSelected = Object.assign({}, styles.sideButton, { backgroundColor: theme.selectedColor });
		styles.sideButtonText = Object.assign({}, styles.buttonText);

		styles.emptyFolderIcon = { ...styles.sidebarIcon, marginRight: 10 };

		return StyleSheet.create(styles);
	}, [props.themeId]);

	useEffect(() => {
		if (props.syncStarted) {
			syncIconAnimation = Animated.loop(
				Animated.timing(syncIconRotationValue, {
					toValue: 1,
					duration: 3000,
					easing: Easing.linear,
				})
			);

			syncIconAnimation.start();
		} else {
			if (syncIconAnimation) syncIconAnimation.stop();
			syncIconAnimation = null;
		}
	}, [props.syncStarted]);

	const folder_press = (folder: FolderEntity) => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	};

	const folder_longPress = async (folder: FolderEntity) => {
		if (folder === 'all') return;

		Alert.alert(
			'',
			_('Notebook: %s', folder.title),
			[
				{
					text: _('Rename'),
					onPress: () => {
						if (folder.encryption_applied) {
							alert(_('Encrypted notebooks cannot be renamed'));
							return;
						}

						props.dispatch({ type: 'SIDE_MENU_CLOSE' });

						props.dispatch({
							type: 'NAV_GO',
							routeName: 'Folder',
							folderId: folder.id,
						});
					},
				},
				{
					text: _('Delete'),
					onPress: () => {
						Alert.alert('', _('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', folder.title), [
							{
								text: _('OK'),
								onPress: () => {
									void Folder.delete(folder.id);
								},
							},
							{
								text: _('Cancel'),
								onPress: () => {},
								style: 'cancel',
							},
						]);
					},
					style: 'destructive',
				},
				{
					text: _('Cancel'),
					onPress: () => {},
					style: 'cancel',
				},
			],
			{
				cancelable: false,
			}
		);
	};

	const folder_togglePress = (folder: FolderEntity) => {
		props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folder.id,
		});
	};

	const tagButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Tags',
		});
	};

	const configButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('Config');
	};

	const allNotesButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			smartFilterId: 'c3176726992c11e9ac940492261af972',
		});
	};

	const newFolderButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: null,
		});
	};

	const performSync = useCallback(async () => {
		const action = props.syncStarted ? 'cancel' : 'start';

		if (!Setting.value('sync.target')) {
			props.dispatch({
				type: 'SIDE_MENU_CLOSE',
			});

			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				sectionName: 'sync',
			});

			return 'init';
		}

		if (!(await reg.syncTarget().isAuthenticated())) {
			if (reg.syncTarget().authRouteName()) {
				props.dispatch({
					type: 'NAV_GO',
					routeName: reg.syncTarget().authRouteName(),
				});
				return 'auth';
			}

			reg.logger().error('Not authenticated with sync target - please check your credentials.');
			return 'error';
		}

		let sync = null;
		try {
			sync = await reg.syncTarget().synchronizer();
		} catch (error) {
			reg.logger().error('Could not initialise synchroniser: ');
			reg.logger().error(error);
			error.message = `Could not initialise synchroniser: ${error.message}`;
			props.dispatch({
				type: 'SYNC_REPORT_UPDATE',
				report: { errors: [error] },
			});
			return 'error';
		}

		if (action === 'cancel') {
			void sync.cancel();
			return 'cancel';
		} else {
			void reg.scheduleSync(0);
			return 'sync';
		}
	}, [props.syncStarted, props.dispatch]);

	const synchronize_press = useCallback(async () => {
		const actionDone = await performSync();
		if (actionDone === 'auth') props.dispatch({ type: 'SIDE_MENU_CLOSE' });
	}, [performSync, props.dispatch]);

	const renderFolderIcon = (theme: any, folderIcon: FolderIcon) => {
		if (!folderIcon) {
			if (alwaysShowFolderIcons) {
				return <Icon name="folder-outline" style={styles_.emptyFolderIcon} />;
			} else {
				return null;
			}
		}

		if (folderIcon.type === 1) { // FolderIconType.Emoji
			return <Text style={{ fontSize: theme.fontSize, marginRight: 4 }}>{folderIcon.emoji}</Text>;
		} else if (folderIcon.type === 2) { // FolderIconType.DataUrl
			return <Image style={{ width: 20, height: 20, marginRight: 4, resizeMode: 'contain' }} source={{ uri: folderIcon.dataUrl }}/>;
		} else {
			throw new Error(`Unsupported folder icon type: ${folderIcon.type}`);
		}
	};

	const renderFolderItem = (folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number) => {
		const theme = themeStyle(props.themeId);

		const folderButtonStyle: any = {
			flex: 1,
			flexDirection: 'row',
			height: 36,
			alignItems: 'center',
			paddingRight: theme.marginRight,
			paddingLeft: 10,
		};
		if (selected) folderButtonStyle.backgroundColor = theme.selectedColor;
		folderButtonStyle.paddingLeft = depth * 10 + theme.marginLeft;

		const iconWrapperStyle: any = { paddingLeft: 10, paddingRight: 10 };
		if (selected) iconWrapperStyle.backgroundColor = theme.selectedColor;

		let iconWrapper = null;

		const collapsed = props.collapsedFolderIds.indexOf(folder.id) >= 0;
		const iconName = collapsed ? 'chevron-down' : 'chevron-up';
		const iconComp = <Icon name={iconName} style={styles_.folderIcon} />;

		iconWrapper = !hasChildren ? null : (
			<TouchableOpacity
				style={iconWrapperStyle}
				folderid={folder.id}
				onPress={() => {
					if (hasChildren) folder_togglePress(folder);
				}}

				accessibilityLabel={collapsed ? _('Expand folder') : _('Collapse folder')}
				accessibilityRole="togglebutton"
			>
				{iconComp}
			</TouchableOpacity>
		);

		const folderIcon = Folder.unserializeIcon(folder.icon);

		return (
			<View key={folder.id} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableOpacity
					style={{ flex: 1 }}
					onPress={() => {
						folder_press(folder);
					}}
					onLongPress={() => {
						void folder_longPress(folder);
					}}
				>
					<View style={folderButtonStyle}>
						{renderFolderIcon(theme, folderIcon)}
						<Text numberOfLines={1} style={styles_.folderButtonText}>
							{Folder.displayTitle(folder)}
						</Text>
					</View>
				</TouchableOpacity>
				{iconWrapper}
			</View>
		);
	};

	const renderSidebarButton = (key: string, title: string, iconName: string, onPressHandler: Function = null, selected = false) => {
		let icon = <Icon name={iconName} style={styles_.sidebarIcon} />;

		if (key === 'synchronize_button') {
			icon = <Animated.View style={{ transform: [{ rotate: syncIconRotation }] }}>{icon}</Animated.View>;
		}

		const content = (
			<View key={key} style={selected ? styles_.sideButtonSelected : styles_.sideButton}>
				{icon}
				<Text style={styles_.sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler}>
				{content}
			</TouchableOpacity>
		);
	};

	const makeDivider = (key: string) => {
		const theme = themeStyle(props.themeId);
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: theme.dividerColor }} key={key}></View>;
	};

	const renderBottomPanel = () => {
		const theme = themeStyle(props.themeId);

		const items = [];

		items.push(makeDivider('divider_1'));

		items.push(renderSidebarButton('newFolder_button', _('New Notebook'), 'md-folder-open', newFolderButton_press));

		items.push(renderSidebarButton('tag_button', _('Tags'), 'md-pricetag', tagButton_press));

		items.push(renderSidebarButton('config_button', _('Configuration'), 'md-settings', configButton_press));

		items.push(makeDivider('divider_2'));

		const lines = Synchronizer.reportToLines(props.syncReport);
		const syncReportText = lines.join('\n');

		let decryptionReportText = '';
		if (props.decryptionWorker && props.decryptionWorker.state !== 'idle' && props.decryptionWorker.itemCount) {
			decryptionReportText = _('Decrypting items: %d/%d', props.decryptionWorker.itemIndex + 1, props.decryptionWorker.itemCount);
		}

		let resourceFetcherText = '';
		if (props.resourceFetcher && props.resourceFetcher.toFetchCount) {
			resourceFetcherText = _('Fetching resources: %d/%d', props.resourceFetcher.fetchingCount, props.resourceFetcher.toFetchCount);
		}

		const fullReport = [];
		if (syncReportText) fullReport.push(syncReportText);
		if (resourceFetcherText) fullReport.push(resourceFetcherText);
		if (decryptionReportText) fullReport.push(decryptionReportText);

		items.push(renderSidebarButton('synchronize_button', !props.syncStarted ? _('Synchronise') : _('Cancel'), 'md-sync', synchronize_press));

		if (fullReport.length) {
			items.push(
				<Text key="sync_report" style={styles_.syncStatus}>
					{fullReport.join('\n')}
				</Text>
			);
		}

		if (props.syncOnlyOverWifi && props.isOnMobileData) {
			items.push(
				<Text key="net_info" style={styles_.syncStatus}>
					{ _('Mobile data - auto-sync disabled') }
				</Text>
			);
		}

		return <View style={{ flex: 0, flexDirection: 'column', paddingBottom: theme.marginBottom }}>{items}</View>;
	};

	let items = [];

	const theme = themeStyle(props.themeId);

	// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
	// using padding. So instead creating blank elements for padding bottom and top.
	items.push(<View style={{ height: theme.marginTop }} key="bottom_top_hack" />);

	items.push(renderSidebarButton('all_notes', _('All notes'), 'md-document', allNotesButton_press, props.notesParentType === 'SmartFilter'));

	items.push(makeDivider('divider_all'));

	items.push(renderSidebarButton('folder_header', _('Notebooks'), 'md-folder'));

	if (props.folders.length) {
		const result = shared.renderFolders(props, renderFolderItem, false);
		const folderItems = result.items;
		items = items.concat(folderItems);
	}

	const style = {
		flex: 1,
		borderRightWidth: 1,
		borderRightColor: theme.dividerColor,
		backgroundColor: theme.backgroundColor,
	};

	return (
		<View style={style}>
			<View style={{ flex: 1, opacity: props.opacity }}>
				<ScrollView scrollsToTop={false} style={styles_.menu}>
					{items}
				</ScrollView>
				{renderBottomPanel()}
			</View>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		folders: state.folders,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		notesParentType: state.notesParentType,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		// Don't do the opacity animation as it means re-rendering the list multiple times
		// opacity: state.sideMenuOpenPercent,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
		isOnMobileData: state.isOnMobileData,
		syncOnlyOverWifi: state.settings['sync.mobileWifiOnly'],
	};
})(SideMenuContentComponent);
