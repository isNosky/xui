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

var BlocksPage = React.createClass({
	// overview is so special because it must wait the websocket connected before it can get any data
	getInitialState: function() {
		return {msg: "connecting ..."};
	},

	handleClick: function(x) {
	},

	componentWillMount: function() {
		// listen to "update-status" event
		window.addEventListener("update-status", this.handleUpdateStatus);
	},

	componentWillUnmount: function() {
		window.removeEventListener("update-status", this.handleUpdateStatus);
	},

	componentDidMount: function() {
		if (this.props.auto_update) {
			var _this = this;
			fsStatus(function(s) {
				_this.setState({msg: s});
			})
		}
	},

	handleUpdateStatus: function(e) {
		// console.log("eeee", e.detail);
		this.setState({msg: e.detail.message});
	},

	render: function() {
		return <div><pre>Blah</pre></div>;
	}
});


$(document).ready(function(){

	var MENUS = [
		{id: "MM_HOME", description: 'Home'},
	];

	ReactDOM.render(<MainMenu menus = {MENUS} rmenus = {RMENUS}/>,
		document.getElementById('mainMenu'));
});
