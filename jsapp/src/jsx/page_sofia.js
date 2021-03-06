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
 *
 */

'use strict';

import React from 'react';
import verto from './verto/verto';

class SofiaPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			rows: [],
			gwDetails: {name: undefined},
			profileDetails: {name: undefined}
		};
		this.handleProfileStart = this.handleProfileStart.bind(this);
		this.handleProfileStop = this.handleProfileStop.bind(this);
		this.handleProfileRestart = this.handleProfileRestart.bind(this);
		this.handleProfileRescan = this.handleProfileRescan.bind(this);
		this.handleProfileMore = this.handleProfileMore.bind(this);
		this.handleGatewayReg = this.handleGatewayReg.bind(this);
		this.handleGatewayUnreg = this.handleGatewayUnreg.bind(this);
		this.handleGatewayDelete = this.handleGatewayDelete.bind(this);
		this.handleGatewayDetail = this.handleGatewayDetail.bind(this);
		this.handleFSEvent = this.handleFSEvent.bind(this);
		
	}

	handleProfileStart (e) {
		e.preventDefault();
		var profile = e.target.getAttribute("data-action-target");
		verto.fsAPI("sofia", "profile " + profile + " start");
	}

	handleProfileStop (e) {
		e.preventDefault();
		var profile = e.target.getAttribute("data-action-target");
		verto.fsAPI("sofia", "profile " + profile + " stop");
	}

	handleProfileRestart (e) {
		e.preventDefault();
		var profile = e.target.getAttribute("data-action-target");
		verto.fsAPI("sofia", "profile " + profile + " restart");
	}

	handleProfileRescan (e) {
		e.preventDefault();
		var profile = e.target.getAttribute("data-action-target");
		verto.fsAPI("sofia", "profile " + profile + " rescan");
	}

	handleProfileMore (e) {
		e.preventDefault();

		var _this = this;
		var profile_name = e.target.getAttribute("data-action-target");

		if (this.state.profileDetails.name) {
			this.setState({profileDetails: {name: undefined}});
			return;
		}

		verto.fsAPI("sofia", "xmlstatus profile " + profile_name, function(data) {
			var msg = $(data.message);
			console.log(msg);
			var profile = msg[2];
			var info = profile.firstElementChild.firstElementChild;

			var rows = [];

			rows.push({k: info.localName, v: info.innerText});

			while(info = info.nextElementSibling) {
				rows.push({k: info.localName, v: info.innerText});
			}

			_this.setState({profileDetails: {name: profile_name, rows: rows}});
		});
	}

	handleGatewayReg (e) {
		e.preventDefault();
		var gwname = e.target.getAttribute("data-action-target");
		verto.fsAPI("sofia", "profile external register " + gwname);
	}

	handleGatewayUnreg (e) {
		e.preventDefault();

		var gwname = e.target.getAttribute("data-action-target");
		verto.fsAPI("sofia", "profile external unregister " + gwname);
	}

	handleGatewayDelete (e) {
		e.preventDefault();
		var gwname = e.target.getAttribute("data-action-target");
		var _this = this;
		verto.fsAPI("sofia", "profile external killgw " + gwname, function(data) {
			if (data.message.substr(0, 3) == "+OK") {
				console.log(gwname + "deleted, how to delete from the dom?");
				// ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(_this).parentNode);
			}
		});
	}

	handleGatewayDetail (e) {
		e.preventDefault();
		var _this = this;
		var gwname = e.target.getAttribute("data-action-target");

		if (this.state.gwDetails.name) {
			this.setState({gwDetails: {name: undefined}});
			return;
		}

		verto.fsAPI("sofia", "xmlstatus gateway " + gwname, function(data) {
			var msg = $(data.message);
			var gateway = msg[2];
			var param = gateway.firstElementChild;

			var rows = [];

			var row = {}
			var gwname = param.innerText;

			rows.push({k: param.localName, v: param.innerText});

			while(param = param.nextElementSibling) {
				rows.push({k: param.localName, v: param.innerText});
			}

			_this.setState({gwDetails: {name: gwname, rows: rows}});
		});
	}

	handleFSEvent (v, e) {
		console.log("FSevent:", e);
		if (e.eventChannel == "FSevent.custom::sofia::gateway_state") {
			var gw = e.data["Gateway"];
			var st = e.data["State"];
			var rows = [];

			this.state.rows.forEach(function(row) {
				var r = row;
				if (row.type == "gateway" && row.name == gw) {
					r.state = st;
				}
				rows.push(r);
			});

			this.setState({rows: rows});
		} else if (e.eventChannel == "FSevent.custom::sofia::profile_start") {
			rows = [];
			var found = 0;
			var profile_name = e.data["profile_name"];

			this.state.rows.forEach(function(row) {

				if (row.type == "profile" && row.name == profile_name) {
					row.state = "RUNNING(0)";
				}
				rows.push(row);
			});

			if (!found) {
				var profile_uri = e.data["profile_uri"];
				var _this = this;

				var actions = [
					{"action": "Start",   onClick: _this.handleProfileStart},
					{"action": "Stop",    onClick: _this.handleProfileStop},
					{"action": "Restart", onClick: _this.handleProfileRestart},
					{"action": "Rescan",  onClick: _this.handleProfileRescan},
					{"action": "More",    onClick: _this.handleProfileMore}
				];

				rows.push({name: profile_name, type: "profile", data: profile_uri, state: "RUNNING(0)", actions: actions});
			}

			this.setState({rows: rows});
		}
	}

	componentDidMount () {
		var _this = this;

		verto.subscribe("FSevent.custom::sofia::gateway_state", {
			handler: this.handleFSEvent
		});

		verto.subscribe("FSevent.custom::sofia::profile_start", {
			handler: this.handleFSEvent
		});

		verto.fsAPI("sofia", "xmlstatus", function(data) {
			var rows = [];
			var msg = $(data.message);

			msg.find("profile").each(function() {
				var profile = this;
				var actions = [
					{"action": "Start",   onClick: _this.handleProfileStart},
					{"action": "Stop",    onClick: _this.handleProfileStop},
					{"action": "Restart", onClick: _this.handleProfileRestart},
					{"action": "Rescan",  onClick: _this.handleProfileRescan},
					{"action": "More",    onClick: _this.handleProfileMore}
				];
				var row = {
					"name": $(profile).find("name").text(),
					"type": $(profile).find("type").text(),
					"data": $(profile).find("data").text(),
					"state": $(profile).find("state").text(),
					"actions": actions
				};
				rows.push(row);
			});

			msg.find("alias").each(function() {
				var alias = this;
				var row = {
					"name": $(alias).find("name").text(),
					"type": $(alias).find("type").text(),
					"data": $(alias).find("data").text(),
					"state": $(alias).find("state").text(),
					"actions": []
				};
				rows.push(row);
			});

			msg.find("gateway").each(function() {
				var gw = this;
				var actions = [
					{"action": "Reg",   onClick: _this.handleGatewayReg},
					{"action": "UnReg", onClick: _this.handleGatewayUnreg},
					{"action": "Delete",onClick: _this.handleGatewayDelete},
					{"action": "More",  onClick: _this.handleGatewayDetail}
				];
				var row = {
					"name": $(gw).find("name").text(),
					"type": $(gw).find("type").text(),
					"data": $(gw).find("data").text(),
					"state": $(gw).find("state").text(),
					"actions": actions
				};
				rows.push(row);
			});

			_this.setState({rows: rows});
		});
	}

	componentWillUnmount () {
		verto.unsubscribe("FSevent.custom::sofia::gateway_state");
		verto.unsubscribe("FSevent.custom::sofia::profile_start");
	}

	render () {
		var _this = this;
		var rows = [];

		this.state.rows.forEach(function(row) {
			var actions = [];

			if (row.actions) {
				var separator = <span></span>;

				row.actions.forEach(function(action) {
					actions.push(<span key={action.action}>{separator}
						<a href='#' data-action-target={row.name} onClick={action.onClick}>{action.action}</a>
					</span>);
					separator = <span> | </span>;
				});
			}

			rows.push(<tr key={row.name + '+' + row.type}>
				<td>{row.name}</td>
				<td>{row.type}</td>
				<td>{row.data}</td>
				<td>{row.state}</td>
				<td>{actions}</td>
			</tr>);

			if (_this.state.gwDetails.name == row.name) {
				var gateway_params = [];
				var gateways;

				_this.state.gwDetails.rows.forEach(function(p) {
					gateway_params.push(<li>{p.k}: {p.v}</li>);
				})

				gateways = <ul>{gateway_params}</ul>

				rows.push(<tr key={row.name + '+' + row.type + '-gateway-details'}>
					<td colSpan={5}>{gateways}</td>
				</tr>);
			} else if (_this.state.profileDetails.name == row.name) {
				var profile_params = [];
				var profiles;

				_this.state.profileDetails.rows.forEach(function(p) {
					profile_params.push(<li key={p.k}>{p.k}: {p.v}</li>);
				})

				profiles = <ul>{profile_params}</ul>

				rows.push(<tr key={row.name + '+' + row.type + '-profile-details'}>
					<td colSpan={5}>{profiles}</td>
				</tr>);
			}
		});

		return <div><h1>Sofia</h1>
			<table className="table">
			<tbody>
			<tr>
				<th>Name</th>
				<th>Type</th>
				<th>Data</th>
				<th>State</th>
				<th>Action</th>
			</tr>
			{rows}
			</tbody>
			</table>
		</div>;
	}
};

export default SofiaPage;
