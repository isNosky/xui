/*
 * HTML5 GUI Framework for FreeSWITCH - XUI
 * Copyright (C) 2015-2016, Seven Du <dujinfang@x-y-t.cn>
 *
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is XUI - GUI for FreeSWITCH
 *
 * The Initial Developer of the Original Code is
 * Seven Du <dujinfang@x-y-t.cn>
 * Portions created by the Initial Developer are Copyright (C)
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Seven Du <dujinfang@x-y-t.cn>
 *
 * blocks.jsx - Blocks Page
 *
 */

'use strict';

import React from 'react'
import ReactDOM from 'react-dom';
import T from 'i18n-react';
import { Row, Col, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { Router, Route, IndexRoute, Link, hashHistory, Redirect } from 'react-router'
import Languages from "./languages";
import MainMenu from './main-menu';
import FSShow from "./fs_show";
import { CDRsPage, CDRPage } from "./page_cdrs";
import FifoCDRsPage from "./page_fifo_cdrs";
import AboutPage from "./page_about";
import DashBoard from "./dashboard";
import OverViewPage from "./page_overview";
import ChannelsPage from "./page_channels";
import RegistrationsPage from "./page_registrations";
import CallsPage from "./page_calls";
import FSUsersPage from "./page_fs_users";
import SofiaPage from "./page_sofia";
import Conferences from './conferences';
import SystemPage from './page_system';
import Settings from './settings';
import { ConferenceRooms, ConferenceRoom } from './page_conference_rooms';
import { UsersPage, UserPage } from './page_users';
import { RoutesPage, RoutePage } from './page_routes';
import { BlocksPage, BlockPage } from './blocks.js';
import { GatewaysPage, GatewayPage } from './page_gateways';
import { DictsPage, DictPage } from './page_dicts';
import { ModulePage } from './page_module';
import { SIPProfilesPage, SIPProfilePage } from './page_sip';
import { MediaFilesPage, MediaFilePage } from './page_media_files';
import { Login, LoginBox } from './page_login';
import Footer from './footer';
import Terminal from './terminal';

const lang_map = detect_language();
if (lang_map) T.setTexts(lang_map);

const MENUS = [
	{id: "MM_CONFERENCES", description: <T.span text={{ key: "Conference"}} />, data: '/conferences'},
	{id: "MM_CDRS", description: <T.span text={{ key: "CDR"}} />, data: '/cdrs'},
	{id: "MM_ABOUT", description: <T.span text={{ key: "About"}} />, data: '/about'}
];

const RMENUS = [
	{id: "MM_SETTINGS", description: <T.span text="Settings" />, data: "/settings/users"},
	// {id: "MM_PROFILE", description: <T.span text={{ key: "Profiles"}} />, data:"/profiles"},
	{id: "MM_LOGOUT", description: <T.span text="Logout"/>, data: "/logout"}
];

class App extends React.Component{
	render() {
		let main = <div></div>;

		if (this.props.children) { //compoment
			main = this.props.children;
			console.log("props1", this.props);
		} else { //components
			console.log("props2", this.props);
			main = <div id='main'><Row className="clearfix">
				<Col sm={2}>
					<br />
					{this.props.sidebar}
				</Col>
				<Col sm={10} className="leftBar">
					<div id='main'>{this.props.main}</div>
				</Col>
			</Row></div>
		}

		return <div>
			<MainMenu menus = {MENUS} rmenus = {RMENUS}/>
			{ main }
			<Footer/>
		</div>
	}
};

class Home extends React.Component{
	render() {
		const handleLogout = function(params, replace) {
			console.log(params, replace);
			if (verto) verto.logout();
			localStorage.removeItem("xui.username");
			localStorage.removeItem("xui.password");
			ReactDOM.render(<Login/>, document.getElementById('body'));
		}

		return <Router history={hashHistory}>
			<Route path="/" component={App}>
				<IndexRoute components={{sidebar: DashBoard, main: OverViewPage}} />
				<Route path="overview" components={{sidebar: DashBoard, main: OverViewPage}} onlyActiveOnIndex/>
				<Route path="calls" components = {{sidebar: DashBoard, main: CallsPage}}/>
				<Route path="channels" components = {{sidebar: DashBoard, main: ChannelsPage}}/>
				<Route path="registrations" components = {{sidebar: DashBoard, main: RegistrationsPage}}/>
				<Route path="users" components = {{sidebar: DashBoard, main: FSUsersPage}}/>
				<Route path="sofia" components = {{sidebar: DashBoard, main: SofiaPage}}/>

				<Route path="show" component={FSShow} />
				// <Route path="cdrs" component={CDRsPage} />

				<Route path="cdrs">
					<IndexRoute component={CDRsPage} />
					<Route path=":start_stamp" component={CDRPage} />
				</Route>

				<Route path="fifocdrs" component={FifoCDRsPage} />

				<Route path="about" component={AboutPage} />
				<Route path="logout" component={LoginBox} onEnter={handleLogout}/>

				<Route path="conferences" component={Conferences} />

				<Route path="settings">
				    <IndexRoute components={{sidebar: Settings, main: UsersPage}}/>
					<Route path="users">
						<IndexRoute components={{sidebar: Settings, main: UsersPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: UserPage}}/>
					</Route>
					<Route path="gateways">
						<IndexRoute components={{sidebar: Settings, main: GatewaysPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: GatewayPage}}/>
					</Route>
					<Route path="dicts">
						<IndexRoute components={{sidebar: Settings, main: DictsPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: DictPage}}/>
					</Route>
					<Route path="module">
						<IndexRoute components={{sidebar: Settings, main: ModulePage}}/>
					</Route>
					<Route path="conference_rooms">
						<IndexRoute components={{sidebar: Settings, main: ConferenceRooms}}/>
						<Route path=":id" components={{sidebar: Settings, main: ConferenceRoom}}/>
					</Route>
					<Route path="sip_profiles">
						<IndexRoute components={{sidebar: Settings, main: SIPProfilesPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: SIPProfilePage}}/>
					</Route>
					<Route path="routes">
						<IndexRoute components={{sidebar: Settings, main: RoutesPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: RoutePage}}/>
					</Route>
					<Route path="blocks">
						<IndexRoute components={{sidebar: Settings, main: BlocksPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: BlockPage}}/>
					</Route>
					<Route path="media_files">
						<IndexRoute components={{sidebar: Settings, main: MediaFilesPage}}/>
						<Route path=":id" components={{sidebar: Settings, main: MediaFilePage}}/>
					</Route>
					<Route path="system" components={{sidebar: Settings, main: SystemPage}}/>
					<Route path="term" components={{sidebar: Settings, main: Terminal}}/>
				</Route>
			</Route>
		</Router>
	}
};


$(document).ready(function() {
	ReactDOM.render(<Login/>, document.getElementById('body'));
});

export { Home };
