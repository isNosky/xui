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
import T from 'i18n-react';
import verto from './verto/verto';

class FSUsersPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {rows: []};
	}

	handleClick(x) {
	}

	componentWillMount() {
	}

	componentWillUnmount() {
		verto.unsubscribe("presense", {handler: this.handleFSEvent});
	}

	componentDidMount() {
		var _this = this;
		verto.fsAPI("list_users", "", function(data) {
			// console.log(data.message);
			var lines = data.message.split("\n");
			var rows = [];

			for (var i = 0; i < lines.length; i++) {
				if (i == 0 || i >= lines.length - 2) continue;

				var cols = lines[i].split("|");
				var row = {};

				row.index = i;
				row.userid    = cols[0];
				row.context   = cols[1];
				row.domain    = cols[2];
				row.group     = cols[3];
				row.contact   = cols[4];
				row.callgroup = cols[5];
				row.cidname   = cols[6];
				row.cidnumber = cols[7];
				rows.push(row);
			}

			_this.setState({rows: rows});
		}, function(e) {
			console.log("list_users ERR");
		});

		verto.subscribe("presence", {handler: this.handleFSEvent});
	}

	handleFSEvent(v, e) {
		console.log('presense', e);

		if (e.data.callerUserName) {
			const rows = this.state.rows.map(function(row) {
				if (row.userid == e.data.callerUserName) {
					row.channelCallState = e.data.channelCallState;
				}

				return row;
			});

			this.setState({rows: rows});
		}
	}

	render() {
		var rows = [];
		this.state.rows.forEach(function(row) {
			rows.push(<tr key={row.index} className={row.channelCallState}>
					<td>{row.userid}</td>
					<td>{row.context}</td>
					<td>{row.domain}</td>
					<td>{row.group}</td>
					<td>{row.callgroup}</td>
					<td>{row.cidname}</td>
					<td>{row.cidnumber}</td>
					<td>{row.constact}</td>
			</tr>);
		})

		return <div>
			<h1><T.span text="Users"/></h1>
			<div>
				<table className="table">
				<tbody>
				<tr>
					<th><T.span text="ID"/></th>
					<th><T.span text="Context"/></th>
					<th><T.span text="Domain"/></th>
					<th><T.span text="Group"/></th>
					<th><T.span text="Callgroup"/></th>
					<th><T.span text="CID Name"/></th>
					<th><T.span text="CID Number"/></th>
					<th><T.span text="Contact"/></th>
				</tr>
				{rows}
				</tbody>
				</table>
			</div>
		</div>
	}
};

export default FSUsersPage;
