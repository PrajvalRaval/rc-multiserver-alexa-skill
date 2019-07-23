const axios = require('axios');
const apiEndpoints = require('./apiEndpoints');
const envVariables = require('./config');
const removeWhitespace = require('remove-whitespace');


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



const postMessage = async (channelName, message, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.postmessageurl }`, {
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
			console.log('ERROR', err.message);
			if (err.response.status === 401) {
				return ri('POST_MESSAGE.AUTH_ERROR');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		});

function getStaticAndDynamicSlotValuesFromSlot(slot) {

	const result = {
		name: slot.name,
		value: slot.value,
	};

	if (((slot.resolutions || {}).resolutionsPerAuthority || [])[0] || {}) {
		slot.resolutions.resolutionsPerAuthority.forEach((authority) => {
			const slotValue = {
				authority: authority.authority,
				statusCode: authority.status.code,
				synonym: slot.value || undefined,
				resolvedValues: slot.value,
			};
			if (authority.values && authority.values.length > 0) {
				slotValue.resolvedValues = [];

				authority.values.forEach((value) => {
					slotValue.resolvedValues.push(value);
				});

			}

			if (authority.authority.includes('amzn1.er-authority.echo-sdk.dynamic')) {
				result.dynamic = slotValue;
			} else {
				result.static = slotValue;
			}
		});
	}

	if (result.hasOwnProperty('dynamic') && result.dynamic.statusCode === 'ER_SUCCESS_MATCH') {
		return result.dynamic.resolvedValues[0].value.name;
	} else if (result.hasOwnProperty('static') && result.static.statusCode === 'ER_SUCCESS_MATCH') {
		return result.static.resolvedValues[0].value.name;
	} else {
		return result.value;
	}
}

function replaceWhitespacesFunc(str) {
	return removeWhitespace(str);
}



// Module Export of Functions


module.exports.postMessage = postMessage;
module.exports.getData = getData;
module.exports.getStaticAndDynamicSlotValuesFromSlot = getStaticAndDynamicSlotValuesFromSlot;
module.exports.replaceWhitespacesFunc = replaceWhitespacesFunc;
