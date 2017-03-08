'use strict';

import VertoLiveArray from './verto-livearray';
import VertoConfMan from './verto-confman';
import VertoDialog from './verto-dialog';
import VertoRtc from './verto-rtc';

function drop_bad(verto, channel) {
	console.error("drop unauthorized channel: " + channel);
	delete verto.eventSUBS[channel];
}

function mark_ready(verto, channel) {
	for (var j in verto.eventSUBS[channel]) {
		verto.eventSUBS[channel][j].ready = true;

		console.log("subscribed to channel: " + channel);
		if (verto.eventSUBS[channel][j].readyHandler) {
			verto.eventSUBS[channel][j].readyHandler(verto, channel);
		}
	}
}

function ENUM(s) {
	var i = 0, o = {};
	s.split(" ").map(function(x) {
		o[x] = {
			name: x,
			val: i++
		};
	});
	return Object.freeze(o);
};

class Verto {
	constructor(params, callbacks) {
		this._ws_socket = null;
		this.q = [];
		this._ws_callbacks = {};
		this._current_id = 0;
		this.options = {};
		this.SERNO = 1;
		this.dialog = null;
		this.dialogs = {};
		this.params = params;
		this.callbacks = callbacks;
		this.videoDevices = [];
		this.audioInDevices = [];
		this.audioOutDevices = [];

		this.generateGUID = (typeof(window.crypto) !== 'undefined' &&
			typeof(window.crypto.getRandomValues) !== 'undefined') ? function() {
			// If we have a cryptographically secure PRNG, use that
			// http://stackoverflow.com/questions/6906916/collisions-when-generating-uuids-in-javascript
			var buf = new Uint16Array(8);
			window.crypto.getRandomValues(buf);
			var S4 = function(num) {
				var ret = num.toString(16);
				while (ret.length < 4) {
					ret = "0" + ret;
				}
				return ret;
			};
			return (S4(buf[0]) + S4(buf[1]) + "-" + S4(buf[2]) + "-" + S4(buf[3]) + "-" + S4(buf[4]) + "-" + S4(buf[5]) + S4(buf[6]) + S4(buf[7]));
		} : function() {
			// Otherwise, just use Math.random
			// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0,
				v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		};
	}

	static init(obj, runtime) {
		var verto = this;
		var rtc = new VertoRtc();
		if (!obj) {
			obj = {};
		}

		if (!obj.skipPermCheck && !obj.skipDeviceCheck) {
			rtc.checkPerms(function(status) {
			  verto.checkDevices(runtime);
			}, true, true);
		} else if (obj.skipPermCheck && !obj.skipDeviceCheck) {
			verto.checkDevices(runtime);
		} else if (!obj.skipPermCheck && obj.skipDeviceCheck) {
			rtc.checkPerms(function(status) {
			  runtime(status);
			}, true, true);
		} else {
			runtime(null);
		}
	}

	connect(video_params, callbacks) {
		console.log("verto connect", this.options.socketUrl);
		if (video_params.socketUrl == null) {
			return;
		}

		const _this = this;
		this.options = Object.assign({
			login: null,
			passwd: null,
			socketUrl: null,
			tag: null,
			localTag: null,
			videoParams: {},
			audioParams: {},
			loginParams: {},
			deviceParams: {onResCheck: null},
			userVariables: {},
			iceServers: false,
			ringSleep: 6000,
			sessid: null,

			onmessage: function(e) {
				return _this.handleMessage(e.eventData);
			},
			onWSConnect: function(o) {
				console.log("connected!!!!");
				o.call('login', {});
			},
			onWSLogin: function(verto, success) {
				fire_event("verto-login", success);
			},
			onWSClose: function(verto, success) {
				_this.purge();
			}
		}, video_params, callbacks);

		console.error("options", this.options);
		console.error("video_params", video_params);

		if (this.options.deviceParams.useCamera) {
			// $.FSRTC.getValidRes(verto.options.deviceParams.useCamera, verto.options.deviceParams.onResCheck);
		}

		if (!this.options.deviceParams.useMic) {
			this.options.deviceParams.useMic = "any";
		}

		if (!this.options.deviceParams.useSpeak) {
			this.options.deviceParams.useSpeak = "any";
		}

		if (this.options.sessid) {
			this.sessid = this.options.sessid;
		} else {
			this.sessid = localStorage.getItem("verto_session_uuid") || this.generateGUID();
			localStorage.setItem("verto_session_uuid", this.sessid);
		}

		this.dialogs = {};
		this.callbacks = callbacks || {};
		this.eventSUBS = {};
		this.connectSocket();

		var tag = this.options.tag;
		if (typeof(tag) === "function") {
		  tag = tag();
		}

		if (this.options.ringFile && this.options.tag) {
			this.ringer = document.getElementById(tag);
		}

		this.call('login', {});
	}

	connectSocket() {
		var self = this;

		if (self.to) {
			clearTimeout(self.to);
		}

		if (!self.socketReady()) {
			self.authing = false;

			if (self._ws_socket) {
				delete self._ws_socket;
			}

			// No socket, or dying socket, let's get a new one.
			self._ws_socket = new WebSocket(self.options.socketUrl);

			if (self._ws_socket) {
				// Set up onmessage handler.
				self._ws_socket.onmessage = function(event) { self._onMessage(event); };
				self._ws_socket.onclose = function (w) {
					if (!self.ws_sleep) {
						self.ws_sleep = 1000;
					}

					if (self.options.onWSClose) {
						self.options.onWSClose(self);
					}

					console.error("Websocket Lost " + self.ws_cnt + " sleep: " + self.ws_sleep + "msec");

					self.to = setTimeout(function() {
						console.log("Attempting Reconnection....");
						self.connectSocket();
					}, self.ws_sleep);

					self.ws_cnt++;

					if (self.ws_sleep < 3000 && (self.ws_cnt % 10) === 0) {
						self.ws_sleep += 1000;
					}
				};

				// Set up sending of message for when the socket is open.
				self._ws_socket.onopen = function() {
					if (self.to) {
						clearTimeout(self.to);
					}

					self.ws_sleep = 1000;
					self.ws_cnt = 0;

					if (self.options.onWSConnect) {
						self.options.onWSConnect(self);
					}

					var req;
					while ((req = self.q.pop())) {
						self._ws_socket.send(req);
					}
				};
			}
		}

		return self._ws_socket ? true : false;
	}

	socketReady() {
		if (this._ws_socket === null || this._ws_socket.readyState > 1) {
			return false;
		}

		return true;
	}

	purge() {
		var verto = this;
		var x = 0;
		var i;

		for (i in verto.dialogs) {
			if (!x) {
				console.log("purging dialogs");
			}
			x++;
			verto.dialogs[i].setState($.verto.enum.state.purge);
		}

		for (i in verto.eventSUBS) {
			if (verto.eventSUBS[i]) {
				console.log("purging subscription: " + i);
				delete verto.eventSUBS[i];
			}
		}
	}

	call(method, params, success_cb, error_cb) {
		// Construct the JSON-RPC 2.0 request.

		if (!params) {
			params = {};
		}

		if (this.sessid) {
			params.sessid = this.sessid;
		}

		var request = {
			jsonrpc : '2.0',
			method  : method,
			params  : params,
			id      : this._current_id++  // Increase the id counter to match request/response
		};

		if (!success_cb) {
			success_cb = function(e){console.log("Success: ", e);};
		}

		if (!error_cb) {
			error_cb = function(e){console.log("Error: ", e);};
		}

		var request_json = JSON.stringify(request);

		if (this._ws_socket.readyState < 1) {
			// The websocket is not open yet; we have to set sending of the message in onopen.
			self = this; // In closure below, this is set to the WebSocket.  Use self instead.
			this.q.push(request_json);
		} else {
			// We have a socket and it should be ready to send on.
			// console.log(request_json);
			this._ws_socket.send(request_json);
		}

		// Setup callbacks.  If there is an id, this is a call and not a notify.
		if ('id' in request && typeof(success_cb) !== 'undefined') {
			this._ws_callbacks[request.id] = { request: request_json, request_obj: request, success_cb: success_cb, error_cb: error_cb };
		}
	}

	_onMessage(event) {
		// Check if this could be a JSON RPC message.
		var response;
		const self = this;

		// Special sub proto
		if (event.data[0] == "#" && event.data[1] == "S" && event.data[2] == "P") {
			if (event.data[3] == "U") {
			this.up_dur = parseInt(event.data.substring(4));
			} else if (this.speedCB && event.data[3] == "D") {
				this.down_dur = parseInt(event.data.substring(4));

				var up_kps = (((this.speedBytes * 8) / (this.up_dur / 1000)) / 1024).toFixed(0);
				var down_kps = (((this.speedBytes * 8) / (this.down_dur / 1000)) / 1024).toFixed(0);

				console.info("Speed Test: Up: " + up_kps + " Down: " + down_kps);
				this.speedCB(event, { upDur: this.up_dur, downDur: this.down_dur, upKPS: up_kps, downKPS: down_kps });
				this.speedCB = null;
			}

			return;
		}

		response = JSON.parse(event.data);

		/// @todo Make using the jsonrcp 2.0 check optional, to use this on JSON-RPC 1 backends.

		if (typeof(response) === 'object' &&
			'jsonrpc' in response &&
			response.jsonrpc === '2.0') {

			/// @todo Handle bad response (without id).
			// If this is an object with result, it is a response.
			if ('result' in response && this._ws_callbacks[response.id]) {
				// Get the success lcallback.
				var success_cb = this._ws_callbacks[response.id].success_cb;

				// set the sessid if present
				// if ('sessid' in response.result && !this.options.sessid || (this.options.sessid != response.result.sessid)) {
				//     this.options.sessid = response.result.sessid;
				//     if (this.options.sessid) {
				//         console.log("setting session UUID to: " + this.options.sessid);
				//     }
				// }

				// Delete the callback from the storage.
				delete this._ws_callbacks[response.id];

				// Run callback with result as parameter.
				success_cb(response.result, this);
				return;
			} else if ('error' in response && self._ws_callbacks[response.id]) {
				// If this is an object with error, it is an error response.

				// Get the error callback.
				var error_cb = self._ws_callbacks[response.id].error_cb;
				var orig_req = self._ws_callbacks[response.id].request;

				// if this is an auth request, send the credentials and resend the failed request
				if (!self.authing && response.error.code == -32000 && self.options.login && self.options.passwd) {
					self.authing = true;

					self.call("login", { login: self.options.login, passwd: self.options.passwd, loginParams: self.options.loginParams,
						userVariables: self.options.userVariables},
						this._ws_callbacks[response.id].request_obj.method == "login" ? function(e) {
							self.authing = false;
							console.log("logged in");
							delete self._ws_callbacks[response.id];

							if (self.options.onWSLogin) {
								self.options.onWSLogin(true, self);
							}
						} : function(e) {
							self.authing = false;
							console.log("logged in, resending request id: " + response.id);
							var socket = self.options.getSocket(self.wsOnMessage);
							if (socket !== null) {
								socket.send(orig_req);
							}
							if (self.options.onWSLogin) {
								self.options.onWSLogin(true, self);
							}
						},

						function(e) {
							console.log("error logging in, request id:", response.id);
							delete self._ws_callbacks[response.id];
							error_cb(response.error, this);
							if (self.options.onWSLogin) {
							self.options.onWSLogin(false, self);
							}
						});
					return;
				}

				// Delete the callback from the storage.
				delete self._ws_callbacks[response.id];

				// Run callback with the error object as parameter.
				error_cb(response.error, self);
				return;
			}
		}

		// This is not a JSON-RPC response.  Call the fallback message handler, if given.
		if (typeof(this.options.onmessage) === 'function') {
			event.eventData = response;
			if (!event.eventData) {
				event.eventData = {};
			}

			var reply = this.options.onmessage(event);

			if (reply && typeof(reply) === "object" && event.eventData.id) {
				var msg = {
					jsonrpc: "2.0",
					id: event.eventData.id,
					result: reply
				};

				if (this._ws_socket !== null) {
					this._ws_socket.send($.toJSON(msg));
				}
			}
		}
	}

	handleMessage(data) {
		var verto = this;

		if (!(data && data.method)) {
			console.error("Invalid Data", data);
			return;
		}

		if (data.params.callID) {
			var dialog = verto.dialogs[data.params.callID];

			if (data.method === "verto.attach" && dialog) {
				delete dialog.verto.dialogs[dialog.callID];
				dialog.rtc.stop();
				dialog = null;
			}

			if (dialog) {
				switch (data.method) {
				case 'verto.bye':
					dialog.hangup(data.params);
					break;
				case 'verto.answer':
					dialog.handleAnswer(data.params);
					break;
				case 'verto.media':
					dialog.handleMedia(data.params);
					break;
				case 'verto.display':
					dialog.handleDisplay(data.params);
					break;
				case 'verto.info':
					dialog.handleInfo(data.params);
					break;
				default:
					console.debug("INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED", dialog, data.method);
					break;
				}
			} else {
				switch (data.method) {
				case 'verto.attach':
					data.params.attach = true;

					if (data.params.sdp && data.params.sdp.indexOf("m=video") > 0) {
						data.params.useVideo = true;
					}

					if (data.params.sdp && data.params.sdp.indexOf("stereo=1") > 0) {
						data.params.useStereo = true;
					}

					dialog = new VertoDialog(Verto.enum.direction.inbound, verto, data.params);
					dialog.setState(Verto.enum.state.recovering);

					break;
				case 'verto.invite':

					if (data.params.sdp && data.params.sdp.indexOf("m=video") > 0) {
						data.params.wantVideo = true;
					}

					if (data.params.sdp && data.params.sdp.indexOf("stereo=1") > 0) {
						data.params.useStereo = true;
					}

					dialog = new VertoDialog(Verto.enum.direction.inbound, verto, data.params);
					break;
				default:
					console.debug("INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED");
					break;
				}
			}

			return {
				method: data.method
			};
		} else {
			switch (data.method) {
			case 'verto.punt':
				verto.purge();
				verto.logout();
				break;
			case 'verto.event':
				var list = null;
				var key = null;

				if (data.params) {
					key = data.params.eventChannel;
				}

				if (key) {
					list = verto.eventSUBS[key];

					if (!list) {
						list = verto.eventSUBS[key.split(".")[0]];
					}
				}

				if (!list && key && key === verto.sessid) {
					if (verto.callbacks.onMessage) {
						verto.callbacks.onMessage(verto, null, Verto.enum.message.pvtEvent, data.params);
					}
				} else if (!list && key && verto.dialogs[key]) {
					verto.dialogs[key].sendMessage(Verto.enum.message.pvtEvent, data.params);
				} else if (!list) {
					if (!key) {
						key = "UNDEFINED";
					}
					console.error("UNSUBBED or invalid EVENT " + key + " IGNORED");
				} else {
					for (var i in list) {
						var sub = list[i];

						if (!sub || !sub.ready) {
							console.error("invalid EVENT for " + key + " IGNORED");
						} else if (sub.handler) {
							sub.handler(verto, data.params, sub.userData);
						} else if (verto.callbacks.onEvent) {
							verto.callbacks.onEvent(verto, data.params, sub.userData);
						} else {
							console.log("EVENT:", data.params);
						}
					}
				}

				break;

			case "verto.info":
				if (verto.callbacks.onMessage) {
					verto.callbacks.onMessage(verto, null, Verto.enum.message.info, data.params.msg);
				}
				//console.error(data);
				// console.debug("MESSAGE from: " + data.params.msg.from, data.params.msg.body);

				break;

			default:
				console.error("INVALID METHOD OR NON-EXISTANT CALL REFERENCE IGNORED", data.method);
				break;
			}
		}
	}

	processReply(method, success, e) {
		var verto = this;
		var i;

		console.log("Response: " + method, success, e);

		switch (method) {
		case "verto.subscribe":
			for (i in e.unauthorizedChannels) {
				drop_bad(verto, e.unauthorizedChannels[i]);
			}
			for (i in e.subscribedChannels) {
				mark_ready(verto, e.subscribedChannels[i]);
			}

			break;
		case "verto.unsubscribe":
			//console.error(e);
			break;
		}
	}

	sendMethod(method, params, success_cb, error_cb) {
		const self = this;
		this.call(method, params, function(e) {
			/* Success */
			self.processReply(method, true, e);
			console.log("sendMethod success", e);
			if (success_cb) success_cb(e);
		}, function(e) {
			/* Error */
			console.log("sendMethod ERR", e);
			if (error_cb) error_cb(e);
			self.processReply(method, false, e);
		});
	}

	broadcast(channel, params) {
		var msg = {
			eventChannel: channel,
			data: {}
		};

		for (var i in params) {
			msg.data[i] = params[i];
		}

		this.sendMethod("verto.broadcast", msg);
	}

	fsAPI(cmd, arg, success_cb, failed_cb) {
		this.sendMethod("jsapi", {
			command: "fsapi",
			data: {
				cmd: cmd,
				arg: arg
			},
		}, success_cb, failed_cb);
	}

	fsStatus(success_cb, failed_cb) {
		this.sendMethod("jsapi", {
			command: "fsapi",
			data: {
				cmd: "status"
			},
		}, success_cb, failed_cb);
	}

	showFSAPI(what, success_cb, failed_cb) {
		this.sendMethod("jsapi", {
			command: "fsapi",
			data: {
				cmd: "show",
				arg: what + " as json"
			},
		}, success_cb, failed_cb);
	}

	do_subscribe(verto, channel, subChannels, sparams) {
		var verto = this;
		var params = sparams || {};

		var local = params.local;

		var obj = {
			eventChannel: channel,
			userData: params.userData,
			handler: params.handler,
			ready: false,
			readyHandler: params.readyHandler,
			serno: verto.SERNO++
		};

		var isnew = false;

		if (!verto.eventSUBS[channel]) {
			verto.eventSUBS[channel] = [];
			subChannels.push(channel);
			isnew = true;
		}

		verto.eventSUBS[channel].push(obj);

		if (local) {
			obj.ready = true;
			obj.local = true;
		}

		if (!isnew && verto.eventSUBS[channel][0].ready) {
			obj.ready = true;
			if (obj.readyHandler) {
				obj.readyHandler(verto, channel);
			}
		}

		return {
			serno: obj.serno,
			eventChannel: channel
		};

	}

	subscribe(channel, sparams) {
		var verto = this;
		var r = [];
		var subChannels = [];
		var params = sparams || {};

		if (typeof(channel) === "string") {
			r.push(verto.do_subscribe(verto, channel, subChannels, params));
		} else {
			for (var i in channel) {
				r.push(verto.do_subscribe(verto, channel, subChannels, params));
			}
		}

		if (subChannels.length) {
			verto.sendMethod("verto.subscribe", {
				eventChannel: subChannels.length == 1 ? subChannels[0] : subChannels,
				subParams: params.subParams
			});
		}

		return r;
	}

	unsubscribe(handle) {
		var verto = this;
		var i;

		if (!handle) {
			for (i in verto.eventSUBS) {
				if (verto.eventSUBS[i]) {
					verto.unsubscribe(verto.eventSUBS[i]);
				}
			}
		} else {
			var unsubChannels = {};
			var sendChannels = [];
			var channel;

			if (typeof(handle) == "string") {
				delete verto.eventSUBS[handle];
				unsubChannels[handle]++;
			} else {
				for (i in handle) {
					if (typeof(handle[i]) == "string") {
						channel = handle[i];
						delete verto.eventSUBS[channel];
						unsubChannels[channel]++;
					} else {
						var repl = [];
						channel = handle[i].eventChannel;

						for (var j in verto.eventSUBS[channel]) {
							if (verto.eventSUBS[channel][j].serno == handle[i].serno) {} else {
								repl.push(verto.eventSUBS[channel][j]);
							}
						}

						verto.eventSUBS[channel] = repl;

						if (verto.eventSUBS[channel].length === 0) {
							delete verto.eventSUBS[channel];
							unsubChannels[channel]++;
						}
					}
				}
			}

			for (var u in unsubChannels) {
				console.log("Sending Unsubscribe for: ", u);
				sendChannels.push(u);
			}

			if (sendChannels.length) {
				verto.sendMethod("verto.unsubscribe", {
					eventChannel: sendChannels.length == 1 ? sendChannels[0] : sendChannels
				});
			}
		}
	}

	newCall(args, callbacks) {
		if (!this.socketReady()) {
			console.error("Not Connected...");
			return;
		}

		var dialog = new VertoDialog(Verto.enum.direction.outbound, this, args);

		dialog.invite();

		if (callbacks) {
			dialog.callbacks = callbacks;
		}

		return dialog;
	}

	videoParams(obj) {
		console.log('videoParams', obj);
	}

	logout(msg) {
		var verto = this;
		verto.closeSocket();
		if (verto.callbacks.onWSClose) {
			verto.callbacks.onWSClose(verto, false);
		}
		verto.purge();
	}

	closeSocket() {
		var self = this;
		if (self.socketReady()) {
			self._ws_socket.onclose = function (w) {console.log("Closing Socket");};
			self._ws_socket.close();
		}
	}

	static checkDevices(runtime) {
		var verto = this;
		console.info("enumerating devices");
		var aud_in = [], aud_out = [], vid = [];

		if ((!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) && MediaStreamTrack.getSources) {
			MediaStreamTrack.getSources(function (media_sources) {
				for (var i = 0; i < media_sources.length; i++) {
					if (media_sources[i].kind == 'video') {
						vid.push(media_sources[i]);
					} else {
						aud_in.push(media_sources[i]);
					}
				}

				verto.videoDevices = vid;
				verto.audioInDevices = aud_in;

				console.info("Audio Devices", verto.audioInDevices);
				console.info("Video Devices", verto.videoDevices);
				runtime(true);
			});
		} else {
			/* of course it's a totally different API CALL with different element names for the same exact thing */

			if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
				console.log("enumerateDevices() not supported.");
				return;
			}

			// List cameras and microphones.
			navigator.mediaDevices.enumerateDevices()
			.then(function(devices) {
				devices.forEach(function(device) {
					console.log(device);

					console.log(device.kind + ": " + device.label +
						" id = " + device.deviceId);

					if (device.kind === "videoinput") {
						vid.push({id: device.deviceId, kind: "video", label: device.label});
					} else if (device.kind === "audioinput") {
						aud_in.push({id: device.deviceId, kind: "audio_in", label: device.label});
					} else if (device.kind === "audiooutput") {
						aud_out.push({id: device.deviceId, kind: "audio_out", label: device.label});
					}
				});


				verto.videoDevices = vid;
				verto.audioInDevices = aud_in;
				verto.audioOutDevices = aud_out;

				console.info("Audio IN Devices", verto.audioInDevices);
				console.info("Audio Out Devices", verto.audioOutDevices);
				console.info("Video Devices", verto.videoDevices);
				runtime(true);

			})
			.catch(function(err) {
				console.log(" Device Enumeration ERROR: " + err.name + ": " + err.message);
				runtime(false);
			});
		}
	}

	loginData(params) {
		var verto = this;
		verto.options.login = params.login;
		verto.options.passwd = params.passwd;
		verto.options.login = params.login;
		verto.options.passwd = params.passwd;
		verto.options.loginParams = params.loginParams;
		verto.options.userVariables = params.userVariables;
	}

	login(msg) {
		var verto = this;
		// verto.logout();
		verto.call('login', {});
	}

	hangup(callID) {
		var verto = this;
		if (callID) {
			var dialog = verto.dialogs[callID];

			if (dialog) {
				dialog.hangup();
			}
		} else {
			for (var i in verto.dialogs) {
				verto.dialogs[i].hangup();
			}
		}
	}
}


Verto.enum = {
	state: ENUM("new requesting trying recovering ringing answering early active held hangup destroy purge"),
	direction: ENUM("inbound outbound"),
	message: ENUM("display info pvtEvent"),
	states: Object.freeze({
		new: {
			requesting: 1,
			recovering: 1,
			ringing: 1,
			destroy: 1,
			answering: 1,
			hangup: 1
		},
		requesting: {
			trying: 1,
			hangup: 1,
			active: 1
		},
		recovering: {
			answering: 1,
			hangup: 1
		},
		trying: {
			active: 1,
			early: 1,
			hangup: 1
		},
		ringing: {
			answering: 1,
			hangup: 1
		},
		answering: {
			active: 1,
			hangup: 1
		},
		active: {
			answering: 1,
			requesting: 1,
			hangup: 1,
			held: 1
		},
		held: {
			hangup: 1,
			active: 1
		},
		early: {
			hangup: 1,
			active: 1
		},
		hangup: {
			destroy: 1
		},
		destroy: {},
		purge: {
			destroy: 1
		}
	})
};

export { Verto };

var singleton = new Verto(null);
export default singleton;

if (window && typeof exports == 'undefined' && typeof module == 'undefined') {
	window.verto = Verto;
}
