/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const helperFunctions = require('./helperFunctions');
const dbHelper = require('./helpers/dbHelper');
const envVariables = require('./config');
const layouts = require('./APL/layouts');

// Jargon for Localization
const Jargon = require('@jargon/alexa-skill-sdk');
const {
	ri,
} = Jargon;

// APL Compaitability Checker Function

function supportsAPL(handlerInput) {
	const { supportedInterfaces } = handlerInput.requestEnvelope.context.System.device;
	const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
	return aplInterface != null && aplInterface !== undefined;
}

const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
	},
	async handle(handlerInput) {

		const speechText = ri('WELCOME.NO_SERVER_FOUND');

		return handlerInput.jrb
			.speak(speechText)
			.reprompt(speechText)
			.getResponse();

	},
};

const AddServerIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AddServerIntent';
	},
	async handle(handlerInput) {

		const userID = handlerInput.requestEnvelope.context.System.user.userId;
		const code = handlerInput.requestEnvelope.request.intent.slots.pincode.value;
		const data = await helperFunctions.getData(code);

		const { status } = data;

		if (status === true) {

			const { servername } = data;
			const udata = data.userdata;

			const checkdata = await dbHelper.isValid(userID, servername);

			if (checkdata === true) {

				// CURRENT_SERVER EXISTS IN DYNAMODB

				const speechText = await dbHelper.postData(servername, userID, udata);

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.getResponse();

			} else {

				// CURRENT_SERVER DOES NOT EXISTS IN DYNAMODB


				await dbHelper.postData('current_server', userID, udata);
				const speechText = await dbHelper.postData(servername, userID, udata);

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.getResponse();

			}


		} else {

			const speechText = ri('SERVER.ERROR');

			return handlerInput.jrb
				.speak(speechText)
				.reprompt(speechText)
				.getResponse();


		}

	},
};


const StartedPostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'STARTED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const InProgressPostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus !== 'DENIED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const DeniedPostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED';
	},
	handle(handlerInput) {
		const speechText = ri('POST_MESSAGE.DENIED');

		return handlerInput.jrb
			.speak(speechText)
			.addDelegateDirective({
				name: 'PostMessageIntent',
				confirmationStatus: 'NONE',
				slots: {
					messagechannel: {
						name: 'messagechannel',
						confirmationStatus: 'NONE',
					},
					messagepost: {
						name: 'messagepost',
						confirmationStatus: 'NONE',
					},
				},
			})
			.getResponse();
	},
};

const PostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'COMPLETED' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED';
	},
	async handle(handlerInput) {
		try {
			const {
				accessToken,
			} = handlerInput.requestEnvelope.context.System.user;

			const message = handlerInput.requestEnvelope.request.intent.slots.messagepost.value;
			const channelNameData = helperFunctions.getStaticAndDynamicSlotValuesFromSlot(handlerInput.requestEnvelope.request.intent.slots.messagechannel);
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const headers = await helperFunctions.login(accessToken);
			const speechText = await helperFunctions.postMessage(channelName, message, headers);


			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.postMessageLayout,
						datasources: {

							PostMessageData: {
								type: 'object',
								objectId: 'rcPostMessage',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									channelname: {
										type: 'PlainText',
										text: `#${ channelName }`,
									},
									message: {
										type: 'PlainText',
										text: message,
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
							},

						},
					})
					.getResponse();

			} else {

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
					.getResponse();

			}

		} catch (error) {
			console.error(error);
		}
	},
};

const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
	},
	handle(handlerInput) {
		const speechText = ri('HELP.MESSAGE');

		return handlerInput.jrb
			.speak(speechText)
			.reprompt(speechText)
			.withSimpleCard(ri('HELP.CARD_TITLE'), speechText)
			.getResponse();
	},
};

const CancelAndStopIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			(handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
				handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
	},
	handle(handlerInput) {
		const speechText = ri('GOODBYE.MESSAGE');

		return handlerInput.jrb
			.speak(speechText)
			.withSimpleCard(ri('GOODBYE.CARD_TITLE'), speechText)
			.addDirective({
				type: 'Dialog.UpdateDynamicEntities',
				updateBehavior: 'CLEAR',
			})
			.getResponse();
	},
};

const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
	},
	handle(handlerInput) {
		console.log(`Session ended with reason: ${ handlerInput.requestEnvelope.request.reason }`);

		return handlerInput.responseBuilder
			.addDirective({
				type: 'Dialog.UpdateDynamicEntities',
				updateBehavior: 'CLEAR',
			})
			.getResponse();
	},
};

const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.log(`Error handled: ${ error.message }`);
		const speechText = ri('ERRORS');

		return handlerInput.jrb
			.speak(speechText)
			.reprompt(speechText)
			.getResponse();
	},
};

const skillBuilder = new Jargon.JargonSkillBuilder().installOnto(Alexa.SkillBuilders.standard());

exports.handler = skillBuilder
	.addRequestHandlers(
		LaunchRequestHandler,
		AddServerIntentHandler,
		StartedPostMessageIntentHandler,
		InProgressPostMessageIntentHandler,
		DeniedPostMessageIntentHandler,
		PostMessageIntentHandler,
		HelpIntentHandler,
		CancelAndStopIntentHandler,
		SessionEndedRequestHandler

	)
	.addErrorHandlers(ErrorHandler)
	.withTableName(envVariables.dynamoDBTableName)
	.withAutoCreateTable(true)
	.lambda();
