require('dotenv').config();

const Request = require('request');

const pageToken = process.env.ACCESS_TOKEN;
const flow = require('./flow');

function createGetStarted() {
	Request.post({
		uri: `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${pageToken}`,
		'content-type': 'application/json',
		form: {
			get_started: {
				payload: 'greetings',
			},
			greeting: [
				{
					locale: 'default',
					text: flow.greetings.getStarted,
				},
			],
		},
	}, (error, response, body) => {
		console.log('\nMensagem de boas-vindas:');
		console.log('error:', error);
		console.log('body:', body);
		console.log('statusCode:', response && response.statusCode);
	});
}

function createPersistentMenu() {
	Request.post({
		uri: `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${pageToken}`,
		'content-type': 'application/json',
		form: {
			persistent_menu: [
				{
					locale: 'default',
					call_to_actions: [
						{
							type: 'web_url',
							title: 'Nosso site',
							url: 'http://www.consperj.rj.gov.br/',
						},
						{
							type: 'postback',
							title: 'Ir para o Início',
							payload: 'greetings',
						},
						{
							type: 'postback',
							title: 'Meu Conselho',
							payload: 'whichCCSMenu',
						},
					],
				},
			],
		},
	}, (error, response, body) => {
		console.log('\nMenu lateral:');
		console.log('error:', error);
		console.log('statusCode:', response && response.statusCode);
		console.log('body:', body);
	});
}

// Will be executed when imported
// It's being imported on index.js (or handler.js), should be commented out after first execution (If both status_code aren't 200 you may want to run it again)
// Or you can just run it => node postback.js
async function load() { // eslint-disable-line no-unused-vars
	await createGetStarted();
	await createPersistentMenu();
}

// load();


function createNewLabel(name) { // eslint-disable-line no-unused-vars
	Request.post({
		uri: `https://graph.facebook.com/v2.11/me/custom_labels?access_token=${pageToken}`,
		'content-type': 'application/json',
		form: {
			name,
		},
	}, (error, response, body) => {
		console.log('\nMenu lateral:');
		console.log('error:', error);
		console.log('statusCode:', response && response.statusCode);
		console.log('body:', body);
		console.log('The ID we need:', body.id);
	});
}

// createNewLabel('Admin');
