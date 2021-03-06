/*
 * HTML5 GUI Framework for FreeSWITCH - XUI
 * Copyright (C) 2015-2017, Seven Du <dujinfang@x-y-t.cn>
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
import { ButtonToolbar, ButtonGroup, Button, ProgressBar, Thumbnail } from 'react-bootstrap';
import verto from './verto/verto';
import { VertoLiveArray } from './verto/verto-livearray';

class Member extends React.Component {
	propTypes: {
		onMemberClick: React.PropTypes.func,
	}

	constructor(props) {
		super(props);
		this.state = {};
		this.handleClick = this.handleClick.bind(this);
	}

	// allow the parent to set my state
	componentWillReceiveProps (props) {
		// console.log("props", props);
		this.setState(props.member);
	}

	handleClick (e) {
		var member_id = e.currentTarget.getAttribute("data-member-id");
		this.state.active = !this.state.active;
		this.setState(this.state);
		this.props.onMemberClick(member_id, this.state.active);
	}

	render () {
		const member = this.props.member;
		console.log("member", member);
		var className = member.active ? "member active selected" : "member";

		// console.log('props', this.props);

		if (this.props.displayStyle == 'table') {
			return <tr className={className} data-member-id={member.memberID} onClick={this.handleClick}>
					<td>{member.memberID}</td>
					<td>"{member.cidName}" &lt;{member.cidNumber}&gt;</td>
					<td><div className='inlineleft'>{member.status.audio.floor ? <i className="fa fa-star" style={{color:"blue"}} aria-hidden="true"></i> : <i className="fa fa-star-o" style={{color:"#777"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.talking ? <i className="fa fa-volume-up" style={{color:"green"}} aria-hidden="true"></i> : <i className="fa fa-volume-off" style={{color:"#777"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.deaf ? <i className="fa fa-bell-slash-o" style={{color:"#777"}} aria-hidden="true"></i> : <i className="fa fa-bell-o" style={{color:"green"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.muted ? <i className="fa fa-microphone-slash" style={{color:"#777"}} aria-hidden="true"></i> : <i className="fa fa-microphone" style={{color:"green"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.onHold ? <i className="fa fa-circle-o-notch" style={{color:"#777"}} aria-hidden="true"></i> : <i className="fa fa-circle-o" style={{color:"#ffe200"}} aria-hidden="true"></i>} |&nbsp;
						</div>
						<div className="inline"> <ProgressBar active bsStyle="success" now={member.status.audio.energyScore/50} /></div>
					</td>
					<td>{member.email}</td>
			</tr>;
		} else if (this.props.displayStyle == 'list') {
			return  <div  className={className} data-member-id={member.memberID} onClick={this.handleClick} style={{width: "185px", height: "90px", marginTop:"30px", marginRight:"20px", border:"1px solid #c0c0c0", display:"inline-block"}}>
				<div style={{float:"left"}}>
					<div style={{width: "68px", height: "68px", backgroundImage: "url(/assets/img/z-2.jpg)"}}></div>
					<div style={{textAlign: "center"}}>{member.memberID}</div>
				</div>
				<div style={{float: "left", marginLeft: "5px", marginTop: "5px"}}>
					<div>王凯&nbsp;{member.memberID}</div>
					<div>{member.cidNumber}</div>
					<div style={{marginTop: "23px"}}>
						{member.status.audio.floor ? <i className="fa fa-star" style={{color:"blue"}} aria-hidden="true"></i> : <i className="fa fa-star-o" style={{color:"#777"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.talking ? <i className="fa fa-volume-up" style={{color:"green"}} aria-hidden="true"></i> : <i className="fa fa-volume-off" style={{color:"#777"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.deaf ? <i className="fa fa-bell-slash-o" style={{color:"#777"}} aria-hidden="true"></i> : <i className="fa fa-bell-o" style={{color:"green"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.muted ? <i className="fa fa-microphone-slash" style={{color:"#777"}} aria-hidden="true"></i> : <i className="fa fa-microphone" style={{color:"green"}} aria-hidden="true"></i>} |&nbsp;
						{member.status.audio.onHold ? <i className="fa fa-circle-o-notch" style={{color:"#777"}} aria-hidden="true"></i> : <i className="fa fa-circle-o" style={{color:"#ffe200"}} aria-hidden="true"></i>}
					</div>
				</div>
			</div>
		}
	}
};

class ConferencePage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			name: this.props.name, rows: [], la: null,
			last_outcall_member_id: 0, outcall_rows: [],
			outcallNumber: '', outcallNumberShow: false,
			displayStyle: 'table', toolbarText: false
		};

		this.la = null;
		this.activeMembers = {};

		this.getChannelName = this.getChannelName.bind(this);
		this.handleOutcallNumberChange = this.handleOutcallNumberChange.bind(this);
		this.handleControlClick = this.handleControlClick.bind(this);
		this.handleVertoLogin = this.handleVertoLogin.bind(this);
		this.handleConferenceEvent = this.handleConferenceEvent.bind(this);
		this.handleMemberClick = this.handleMemberClick.bind(this);
	}

	getChannelName (what) { // liveArray chat mod
		return "conference-" + what + "." + this.props.name + "@" + domain;
	}

	handleOutcallNumberChange (e) {
		this.setState({outcallNumber: e.target.value});
	}

	handleControlClick (e) {
		var data = e.target.getAttribute("data");
		console.log("data", data);

		if (data == "lock") {
			fsAPI("conference", this.props.name + " lock");
		} else if (data == "unlock") {
			fsAPI("conference", this.props.name + " unlock");
		} else if (data == "select") {
			var rows = [];
			var _this = this;
			if (this.state.rows.length > 0) {
				var active = !this.state.rows[0].active;

				this.state.rows.forEach(function(row) {
					row.active = active;
					rows.push(row);
					console.log("row", row.active);
					_this.activeMembers[row.memberID] = active;
				});
				this.setState({rows: rows});
			}
			return;
		} else if (data == "call") {
			if (!this.state.outcallNumberShow) {
				this.setState({outcallNumberShow: true});
				this.outcallNumberInput.focus();
				return;
			}

			if (this.state.outcallNumber == '') {
				// this.outcallNumberInput.focus();
				this.setState({outcallNumberShow: false});
				return;
			}

			this.state.last_outcall_member_id--;

			let member = {
				uuid: this.state.last_outcall_member_id,
				memberID: this.state.last_outcall_member_id,
				cidNumber: this.state.outcallNumber,
				cidName: this.state.outcallNumber,
				codec: null,
				status: {audio: {energyScore: 'Calling ...'}, video: {}},
				email: null,
				active: false
			};

			let rows = this.state.outcall_rows;
			rows.unshift(member);
			this.setState({outcall_rows: rows});

			// fsAPI("bgapi", "conference " + this.state.name + " dial user/1007");

			$.ajax({
				type: "POST",
				url: "/api/conferences/" + this.state.name,
				dataType: "json",
				contentType: "application/json",
				data: JSON.stringify({
					from: member.cidNumber,
					to: member.cidNumber}),
				success: function (obj) {
				},
				error: function(msg) {
					console.error("err call", msg);
				}
			});
			return;
		} else if (data == "toolbarText") {
			this.setState({toolbarText: !this.state.toolbarText});
			return;
		} else if (data == "table" || data == "list") {
			this.setState({displayStyle: data});
			return;
		}

		for(var member in this.activeMembers) {
			if (this.activeMembers[member] == true) {
				var args = this.props.name + " " + data + " " + member;
				console.log("args", args);
				fsAPI("conference", args);
			}
		}
	}

	handleMemberClick (member_id, isActive) {
		console.log("member_id", member_id);
		// this.activeMembers[member_id] = isActive;

		var rows = [];
		if (this.state.rows.length > 0) {
			var active = !this.state.rows[0].active;

			this.state.rows.forEach(function(row) {
				if (row.memberID == member_id) {
					row.active = isActive;
				}
				rows.push(row);
				console.log("row", row.active);
			});
			this.setState({rows: rows});
		}
	}

	componentWillMount () {
	}

	componentWillUnmount () {
		if (this.la) this.la.destroy();
		if (this.binding) verto.unsubscribe(this.binding);
	}

	componentDidMount () {
		console.log("conference name:", this.props.name);
		window.addEventListener("verto-login", this.handleVertoLogin);

		const use_livearray = true;

		if (use_livearray) {
			this.la = new VertoLiveArray(verto, this.getChannelName("liveArray"), this.props.name, {
				onChange: this.handleConferenceEvent
			});
		} else {
			this.binding = verto.subscribe(this.getChannelName("liveArray"), {handler: this.handleFSEvent.bind(this),
				userData: verto,
				subParams: {}
			});

			this.laBootstrap(this.getChannelName("liveArray"), {});
		}
	}

	laBootstrap(context, obj) {
		verto.broadcast(context, {
			liveArray: {
				command: "bootstrap",
				context: context,
				name: this.props.name,
				obj: obj
			}
		});
	}

	handleVertoLogin (e) {
		// console.log("eeee", e.detail);
		// if (this.la) this.la.destroy;
		// this.la = new VertoLiveArray(verto, this.getChannelName("liveArray"), this.props.name, {});
		// this.la.onChange = this.handleConferenceEvent;
	}

	handleFSEvent(verto, e) {
		this.handleConferenceEvent(null, e.data);
	}

	handleConferenceEvent (la, a) {
		console.log("onChange FSevent:", a.action, a);

		switch (a.action) {

		case "init":
			break;

		case "bootObj":
			var rows = [];
			a.data.forEach(function(member) {
				rows.push(translateMember(member));
			})
			this.setState({rows: rows});
			break;

		case "add":
			var found = 0;
			var member = translateMember([a.hashKey, a.data]);

			if (member.cidName == "Outbound Call") {
				var outcall_rows = this.state.outcall_rows.filter(function(row) {
					if (row.cidNumber == member.cidNumber) {
						found++;
						return false;
					} else {
						return true;
					}
				});

				if (found) this.setState({outcall_rows: outcall_rows});
			}

			var rows = this.state.rows;
			rows.push(member);
			this.setState({rows: rows});

			break;
		case "modify":
			var rows = [];
			var _this = this;

			this.state.rows = this.state.rows.map(function(row) {
				if (row.uuid == a.hashKey ) {
					var member = translateMember([a.hashKey, a.data]);
					member.active = _this.activeMembers[member.memberID];
					return member;
				} else {
					return row;
				}
			});

			this.setState(this.state);
			break;

		case "del":
			var rows = this.state.rows.filter(function(row) {
				console.log(row.uuid, a.hashKey);
				return row.uuid != a.hashKey;
			});

			this.setState({rows: rows});
			break;

		case "clear":
			this.setState({rows: []});
			break;

		case "reorder":
			break;

		default:
			console.log("unknow action: ", a.action);
			break;
		}
	}

	render () {
		var _this = this;

		const rows = this.state.outcall_rows.concat(this.state.rows);

		const members = rows.map(function(member) {
			return <Member member={member} key={member.uuid} onMemberClick={_this.handleMemberClick} displayStyle={_this.state.displayStyle}/>
		});

		let member_list;

		if (this.state.displayStyle == 'table') {
			member_list = <table className="table conference">
				<tbody>
				<tr>
					<th><T.span text="Member ID"/></th>
					<th><T.span text="CID"/></th>
					<th><T.span text="Status"/></th>
					<th><T.span text="Email"/></th>
				</tr>
				{members}
				</tbody>
			</table>
		} else if (this.state.displayStyle == 'list') {
			member_list = <ul>{members}</ul>
		}

		const toolbarTextStyle = this.state.toolbarText ? null : {display: 'none'};

		return <div>
			<ButtonToolbar className="pull-right">

			<ButtonGroup style={ this.state.outcallNumberShow ? null : {display: 'none'} }>
				<input value={this.state.outcallNumber} onChange={this.handleOutcallNumberChange} size={10}
					ref={(input) => { this.outcallNumberInput = input; }} placeholder="number"/>
			</ButtonGroup>


			<ButtonGroup>
				<Button onClick={this.handleControlClick} data="call">
					<i className="fa fa-phone" aria-hidden="true" data="call"></i>&nbsp;
					<T.span text= "Call" data="call" style={toolbarTextStyle}/>
				</Button>
			</ButtonGroup>

			<ButtonGroup>
				<Button onClick={this.handleControlClick} data="select">
					<i className="fa fa-check-square-o" aria-hidden="true" data="select"></i>&nbsp;
					<T.span text= "Select" data="select" style={toolbarTextStyle}/>
				</Button>
			</ButtonGroup>

			<ButtonGroup>
				<Button onClick={this.handleControlClick} data="mute">
					<i className="fa fa-microphone-slash" aria-hidden="true" data="mute"></i>&nbsp;
					<T.span text= "Mute" data="mute"  style={toolbarTextStyle}/>
				</Button>
				<Button onClick={this.handleControlClick} data="unmute">
					<i className="fa fa-microphone" aria-hidden="true" data="unmute"></i>&nbsp;
					<T.span text= "unMute" data="unmute" style={toolbarTextStyle}/>
				</Button>
				<Button onClick={this.handleControlClick} data="hup">
					<i className="fa fa-power-off" aria-hidden="true" data="hup"></i>&nbsp;
					<T.span text= "Hangup" data="hup" style={toolbarTextStyle}/>
				</Button>
			</ButtonGroup>

			<ButtonGroup>
				<Button onClick={this.handleControlClick} data="lock">
					<i className="fa fa-lock" aria-hidden="true" data="lock"></i>&nbsp;
					<T.span text= "Lock" data="lock" style={toolbarTextStyle}/>
				</Button>
				<Button onClick={this.handleControlClick} data="unlock">
					<i className="fa fa-unlock-alt" aria-hidden="true" data="unlock"></i>&nbsp;
					<T.span text= "unLock" data="unlock" style={toolbarTextStyle}/>
				</Button>
			</ButtonGroup>

			<ButtonGroup>
				<Button onClick={this.handleControlClick} data="table" title={T.translate("Display as Table")}>
					<i className="fa fa-table" aria-hidden="true" data="table"></i>
					<T.span data="table"/>
				</Button>
				<Button onClick={this.handleControlClick} data="list" title={T.translate("Display as List")}>
					<i className="fa fa-list" aria-hidden="true" data="list"></i>
					<T.span data="list"/>
				</Button>
				<Button onClick={this.handleControlClick} data="toolbarText" title={T.translate("Toggle Toolbar Text")}>
					<i className="fa fa-text-width" aria-hidden="true" data="toolbarText"></i>
					<T.span data="toolbarText"/>
				</Button>
			</ButtonGroup>


			</ButtonToolbar>

			<h1><T.span text={{ key: "Conference"}} /><small>{this.props.name}</small></h1>

			<div>
				{member_list}
			</div>
		</div>
	}
};

export default ConferencePage;
