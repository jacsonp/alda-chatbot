// Module for sending attachments to bot
// context is the context from bot.onEvent
// links is the object from flow.js from the respective dialog

module.exports.sendCarousel = async (context, items) => {
	const elements = [];

	items.forEach((element) => {
		elements.push({
			title: element.nome,
			subtitle: element.cargo,
			// image_url: 'https://gallery.mailchimp.com/926cb477483bcd8122304bc56/images/5c87a0a3-febf-40fa-bcbc-bbefee27b9c1.png',
		});
	});
	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements,
		},
	});
};

// sends one card with an image and link
module.exports.sendCardWithLink = async function sendCardWithLink(context, cardData, url, text) {
	if (!text || text === '') { text = 'Veja o resultado dos nossos esforços!'; } // eslint-disable-line no-param-reassign
	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements: [
				{
					title: cardData.title,
					subtitle: (text && text !== '') ? text : cardData.sub,
					image_url: cardData.imageLink,
					default_action: {
						type: 'web_url',
						url,
						messenger_extensions: 'false',
						webview_height_ratio: 'full',
					},
				},
			],
		},
	});
};

module.exports.sendCardWithout = async function sendCardWithLink(context, cardData) {
	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements: [
				{
					title: cardData.title,
					subtitle: cardData.sub,
					image_url: cardData.imageLink,
					// default_action: {
					// 	type: 'web_url',
					// 	url,
					// 	messenger_extensions: 'false',
					// 	webview_height_ratio: 'full',
					// },
				},
			],
		},
	});
};


// get quick_replies opject with elements array
// supossed to be used with menuOptions and menuPostback for each dialog on flow.js
module.exports.getQR = async (opt) => {
	const elements = [];
	const firstArray = opt.menuOptions;

	firstArray.forEach((element, index) => {
		elements.push({
			content_type: 'text',
			title: element,
			payload: opt.menuPostback[index],
		});
	});

	return { quick_replies: elements };
};

module.exports.getQRLocation = async (opt) => {
	const elements = [];
	const firstArray = opt.menuOptions;

	elements.push({ content_type: 'location' });

	firstArray.forEach((element, index) => {
		elements.push({
			content_type: 'text',
			title: element,
			payload: opt.menuPostback[index],
		});
	});

	return { quick_replies: elements };
};

module.exports.getErrorQR = async (opt, lastPostback) => {
	const elements = [];
	const firstArray = opt.menuOptions;

	firstArray.forEach((element, index) => {
		elements.push({
			content_type: 'text',
			title: element,
			payload: opt.menuPostback[index],
		});
	});

	elements.push({
		content_type: 'text',
		title: 'Voltar',
		payload: lastPostback,
	});

	return { quick_replies: elements };
};

module.exports.getConditionalQR = async (options, useSecond) => {
	const elements = [];
	let arrayToUse;
	if (useSecond === true) {
		arrayToUse = options[1]; // eslint-disable-line prefer-destructuring
	} else {
		arrayToUse = options[0]; // eslint-disable-line prefer-destructuring
	}

	const firstArray = arrayToUse.menuOptions;

	firstArray.forEach((element, index) => {
		elements.push({
			content_type: 'text',
			title: element,
			payload: arrayToUse.menuPostback[index],
		});
	});

	return { quick_replies: elements };
};

module.exports.sendShare = async (context, links) => {
	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements: [
				{
					title: links.siteTitle,
					subtitle: links.siteSubTitle,
					image_url: links.imageURL,
					item_url: links.siteURL,
					buttons: [{
						type: 'element_share',
					}],
				},
			],
		},
	});
};

// send a card carousel for the user to confirm which bairro he wants
module.exports.sendConselhoConfirmation = async (context, items) => {
	const elements = [];

	items.forEach((element) => {
		elements.push({
			title: `Bairro ${element.bairro}`,
			subtitle: `CCS ${element.id}`,
			buttons: [{
				type: 'postback',
				title: 'É esse!',
				payload: `confirmBa${element.id}`,
			}],
		});
	});

	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements,
		},
	});
};

// send a card carousel for the user to confirm which municipio he wants
module.exports.sendMunicipioConfirmation = async (context, items) => {
	const elements = [];

	items.forEach((element) => {
		elements.push({
			title: `Município ${element.municipio}`,
			subtitle: `CCS ${element.id}`,
			buttons: [{
				type: 'postback',
				title: 'É esse!',
				payload: `confirmMu${element.id}`,
			}],
		});
	});

	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements,
		},
	});
};

// same as sendConselhoConfirmation but centro needs to use "regiao_novo" e "meta_regiao"
module.exports.sendCentroConfirmation = async (context, items) => {
	const elements = [];

	items.forEach((element) => {
		let bairroText = 'Bairros'; // check if there's only one bairro on this meta_regiao
		if (!element.meta_regiao.includes(',')) { bairroText = 'Bairro'; }
		if (element.regiao_novo.includes('Região')) { element.regiao_novo = element.regiao_novo.replace('Região', ''); } // eslint-disable-line no-param-reassign
		elements.push({
			title: `Região ${element.regiao_novo}`,
			subtitle: `${bairroText}: ${element.meta_regiao.replace(/,(?=[^,]*$)/, ' e')}`,
			buttons: [{
				type: 'postback',
				title: 'É esse!',
				payload: `confirmBa${element.id}`,
			}],
		});
	});

	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements,
		},
	});
};

// same as sendConselhoConfirmation but centro needs to use "regiao_novo" e "meta_regiao"
module.exports.sendColegioConfirmation = async (context, items) => {
	const elements = [];

	items.forEach((element) => {
		elements.push({
			title: `Região ${element.regiao_novo}`,
			subtitle: element.meta_regiao,
			buttons: [{
				type: 'postback',
				title: 'É essa!',
				payload: `confirmBa${element.id}`,
			}],
		});
	});

	await context.sendAttachment({
		type: 'template',
		payload: {
			template_type: 'generic',
			elements,
		},
	});
};
