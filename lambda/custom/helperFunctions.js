const axios = require('axios');
const apiEndpoints = require('./apiEndpoints');
const envVariables = require('./config');

const Jargon = require('@jargon/alexa-skill-sdk');
const {
	ri,
} = Jargon;

// Server Credentials. Follow readme to set them up.
const {
	proxyurl,
} = envVariables;

// Axios Functions

const getData = async (code) =>
	await axios
		.get(`${ proxyurl }/user/data?qcode=${ code }`)
		.then((res) => res.data)
		.then((res) => {
			console.log(res);

			return {
				status: res.status,
				userdata: {
					serverurl: res.data.serverinfo.serverurl,
					headers: res.data.headers,
				},
				servername: res.data.serverinfo.servername,
				speech: ri('SERVER.SUCCESS'),
			};

		})
		.catch((err) => {
			console.log(err);

			return {
				status: err.response.data.status,
				speech: ri('SERVER.ERROR'),
			};

		});



const postMessage = async (channelName, message, headers) =>
	await axios
		.post(
			apiEndpoints.postmessageurl, {
				channel: `#${ channelName }`,
				text: message,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('POST_MESSAGE.SUCCESS');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('POST_MESSAGE.AUTH_ERROR');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		});


// Module Export of Functions


module.exports.postMessage = postMessage;
module.exports.getData = getData;
