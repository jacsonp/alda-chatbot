const googleMapsClient = require('@google/maps').createClient({
	key: process.env.GOOGLE_MAPS_API_KEY,
	Promise,
});

const moment = require('moment');

moment.locale('pt-BR');

const flow = require('./flow');
const attach = require('./attach');
const db = require('./DB_helper');

let CCSBairros;
if (!global.TEST) {
	db.sequelize
		.authenticate()
		.then(async () => {
			console.log('Connection has been established successfully.');
			CCSBairros = await db.getCCS();
			// console.log(JSON.stringify(CCSBairros));
		}).catch((err) => {
			console.error('Unable to connect to the database:', err);
		});
}

let userDataArray = [];
const phoneRegex = new RegExp(/^\+55\d{2}(\d{1})?\d{8}$/);

function formatDate(date) {
	return `${moment(date).format('dddd')}, ${moment(date).format('D')} de ${moment(date).format('MMMM')} às ${moment(date).format('hh:mm')}`;
}
function findCCS(CCSList, place) {
	const result = CCSList.find(obj => (obj.bairro.includes(place)));

	if (result) {
		result.neighborhoods = [];
		CCSList.forEach((element) => {
			if (element.cod_ccs === result.cod_ccs) {
				result.neighborhoods.push(element.bairro);
			}
		});
		console.log(result);
		return result;
	}
	return undefined;
}

function getNeighborhood(results) {
	let neighborhood = results.find(x => x.types.includes('political'));
	if (!neighborhood) { neighborhood = results.find(x => x.types.includes('sublocality')); }
	if (!neighborhood) { neighborhood = results.find(x => x.types.includes('sublocality_level_1')); }
	return neighborhood;
}

const timeLimit = 1000 * 60 * 60; // 60 minutes
const addressComplement = process.env.PROCESS_COMPLEMENT; // => "state, country"
const defaultAddress = process.env.DEFAULT_ADDRESS;
// context.state.geoLocation => the geolocation coordinates from the user
// context.state.address => the address the user types


module.exports = async (context) => {
	try {
		if (!context.event.isDelivery && !context.event.isEcho) {
			// console.dir(context.event);
			// console.dir(context.state);

			if ((context.event.rawEvent.timestamp - context.session.lastActivity) >= timeLimit) {
				if (context.session.user.first_name) { // check if first_name to avoid an 'undefined' value
					await context.sendText(`Olá, ${context.session.user.first_name}! ${flow.greetings.comeBack}`);
					await context.setState({ dialog: 'mainMenu' });
				} else {
					await context.sendText(`Olá! ${flow.greetings.comeBack}`);
					await context.setState({ dialog: 'mainMenu' });
				}
			} else if (context.event.isPostback) {
				await context.setState({ dialog: context.event.postback.payload });
			} else if (context.event.isQuickReply) {
				switch (context.event.quickReply.payload) {
				case 'notMe':
					await context.sendText(flow.aboutMe.notNow);
					await context.setState({ dialog: 'aboutMeMenu' });
					break;
				case 'notCCS':
					await context.sendText(flow.whichCCS.notNow);
					await context.setState({ dialog: 'whichCCSMenu' });
					break;
				case 'whichCCSMenu':
					// falls through
				case 'goBackMenu':
					// falls through
				case 'noLocation':
					await context.sendText(flow.mainMenu.notNow);
					await context.setState({ dialog: 'mainMenu' });
					break;
				case 'notWannaKnow':
					await context.sendText(flow.councilMenu.notNow);
					await context.setState({ dialog: 'councilMenu' });
					break;
				case 'neverWent':
					await context.sendText(flow.nearestCouncil.neverWent);
					await context.setState({ dialog: 'wentAlreadyMenu' });
					break;
				case 'facebook':
					await context.sendText(flow.userData.facebook);
					await context.setState({ dialog: 'userData' });
					break;
				default:
					await context.setState({ dialog: context.event.quickReply.payload });
					break;
				}
			} else if (context.event.isText) {
				if (context.event.message.text === process.env.RESTART) {
					await context.resetState();
					// await context.setState({ dialog: 'greetings' });
					await context.setState({ dialog: 'whichCCSMenu' });
				} else {
					switch (context.state.dialog) {
					case 'retryType':
						// falls through
					case 'confirmLocation':
						// falls through
					case 'wantToType':
						// falls through
					case 'sendLocation':
						// falls through
					case 'whichCCSMenu':
						// falls through
					case 'wantToChange':
						await context.setState({ address: context.event.message.text }); // what the user types is stored here
						await context.setState({ dialog: 'confirmLocation' });
						break;
					case 'eMail':
						await context.setState({ eMail: context.event.message.text });
						await context.setState({ dialog: 'userData' });
						break;
					case 'whatsApp':
						await context.setState({ phone: `+55${context.event.message.text.replace(/[- .)(]/g, '')}` });
						if (phoneRegex.test(context.state.phone)) { // valid phone
							await context.setState({ dialog: 'gotPhone' });
						} else { // invalid phone
							await context.setState({ phone: '', dialog: 'reAskPhone' });
						}
						break;
					default: // regular text message
						await context.setState({ dialog: 'errorText' });
						break;
					}
				}
			} else if (context.event.isLocation) {
				await context.setState({ geoLocation: context.event.location.coordinates });
				await context.setState({ dialog: 'findLocation' });
			} else if (context.event.hasAttachment || context.event.isLikeSticker ||
                context.event.isFile || context.event.isVideo || context.event.isAudio ||
                context.event.isImage || context.event.isFallback) {
				await context.sendImage(flow.greetings.likeImage);
				await context.setState({ dialog: 'mainMenu' });
			}
			switch (context.state.dialog) {
			case 'greetings':
				await context.typingOn();
				await context.sendImage(flow.greetings.greetImage);
				await context.sendText(flow.greetings.welcome);
				await context.typingOff();
				await context.sendText(flow.greetings.firstMessage, await attach.getQR(flow.greetings));
				break;
			case 'aboutMe':
				await context.sendText(flow.aboutMe.firstMessage);
				await context.sendText(flow.aboutMe.secondMessage);
				// falls through
			case 'aboutMeMenu':
				await context.sendText(flow.aboutMe.thirdMessage, await attach.getQR(flow.aboutMe));
				break;
			case 'whichCCS':
				await context.sendText(flow.whichCCS.firstMessage);
				await context.sendText(flow.whichCCS.secondMessage);
				await context.typingOn();
				await context.sendImage(flow.whichCCS.CCSImage);
				await context.typingOff();
				// falls through
			case 'whichCCSMenu':
				await context.setState({ retryCount: 0 });
				// if we don't have a CCS linked to a user already we ask for it
				if (!context.state.CCS || !context.state.userLocation || !context.state.userLocation.neighborhood
                    || !context.state.userLocation.neighborhood.long_name) {
					await context.sendText(flow.whichCCS.thirdMessage, await attach.getQR(flow.whichCCS));
				} else {
					await context.sendText(`${flow.whichCCS.remember} ${context.state.userLocation.neighborhood.long_name} ` +
					`${flow.whichCCS.remember2} ${context.state.CCS.ccs}.`);
					await context.sendText(flow.foundLocation.secondMessage, await attach.getQR(flow.foundLocation));
				}
				break;
			case 'sendLocation':
				await context.sendText(flow.sendLocation.firstMessage);
				await context.sendText(flow.sendLocation.secondMessage, { quick_replies: [{ content_type: 'location' }] });
				break;
			case 'wantToType':
				await context.sendText(flow.wantToType.firstMessage);
				break;
			case 'retryType':
				await context.sendText(flow.wantToChange.firstMessage);
				// falls through
			case 'wantToChange':
				await context.setState({ CCS: undefined, geoLocation: undefined, userLocation: undefined });
				await context.setState({ retryCount: context.state.retryCount + 1 });
				// On the users 3rd try we offer him to either give up or send his location directly
				if (context.state.retryCount >= 3) {
					await context.setState({ retryCount: 0 });
					await context.sendText(`${flow.wantToChange.secondMessage.slice(0, -1)}\n${flow.wantToChange.helpMessage}`, await attach.getQR(flow.wantToChange));
				} else {
					await context.sendText(flow.wantToChange.secondMessage);
				}
				break;
			case 'foundLocation':
				await context.sendText(flow.foundLocation.firstMessage);
				await context.sendText(flow.foundLocation.secondMessage, await attach.getQR(flow.foundLocation));
				break;
			case 'nearestCouncil':
				if (!context.state.userLocation) {
					await context.setState({ userLocation: userDataArray.find(obj => obj.userId === context.session.user.id) });
					// console.log(context.state.userLocation.neighborhood.long_name);
				} // -----

				if (context.state.userLocation) {
					userDataArray = await userDataArray.filter(obj => obj.userId !== context.session.user.id);
					await context.setState({
						CCS: findCCS(CCSBairros, context.state.userLocation.neighborhood.long_name),
					});
					if (context.state.CCS || (context.state.CCS && context.state.CCS.length !== 0)) {
						await context.sendText(flow.nearestCouncil.firstMessage);
						if (context.state.CCS.neighborhoods.length === 1) {
							await context.sendText(`${flow.nearestCouncil.secondMessage} ${context.state.CCS.ccs} ` +
								`${flow.nearestCouncil.secondMessage3} ${context.state.CCS.neighborhoods}.`);
						} else {
							await context.sendText(`${flow.nearestCouncil.secondMessage} ${context.state.CCS.ccs} ` +
							`${flow.nearestCouncil.secondMessage2} ${context.state.CCS.neighborhoods.join(', ').replace(/,(?=[^,]*$)/, ' e')}.`);
						}
						await context.sendText(flow.nearestCouncil.thirdMessage, await attach.getQR(flow.nearestCouncil));
					} else {
						await context.sendText(flow.confirmLocation.noCouncil);
						await context.sendText(flow.confirmLocation.notActive, await attach.getQR(flow.notFound));
					}
				} else {
					await context.sendText(flow.confirmLocation.noFindGeo);
					await context.sendText(flow.confirmLocation.noSecond, await attach.getQR(flow.notFound));
				}
				break;
			case 'wentAlready':
				await context.sendText(flow.wentAlready.firstMessage);
				// falls through
			case 'wentAlreadyMenu':
				await context.sendText(flow.wentAlready.secondMessage, await attach.getQR(flow.wentAlready));
				break;
			case 'wannaKnowMembers':
				await context.typingOn();
				await context.setState({ diretoria: await db.getDiretoria(context.state.CCS.cod_ccs) });
				await context.sendText(`${flow.wannaKnowMembers.firstMessage} ${context.state.CCS.ccs}`);
				await attach.sendCarousel(context, context.state.diretoria);
				await context.sendText(flow.wannaKnowMembers.secondMessage);
				// falls through
			case 'councilMenu':
				await context.sendText(flow.councilMenu.firstMessage, await attach.getQR(flow.councilMenu));
				await context.typingOff();
				break;
			case 'mainMenu':
				await context.sendText(flow.mainMenu.firstMessage, await attach.getQR(flow.mainMenu));
				break;
			case 'calendar':
				await context.typingOn();
				await context.setState({ calendario: await db.getCalendario(context.state.CCS.cod_ccs) });
				await context.sendText(`A próxima reunião do ${context.state.CCS.ccs} será ` +
					`${formatDate(context.state.calendario[0].data_hora)} e vai acontecer no local ` +
					`${context.state.calendario[0].endereco}`); // TODO: review endereço
				await context.sendText(flow.calendar.secondMessage, await attach.getQR(flow.calendar));
				await context.typingOff();
				break;
			case 'subjects':
				await context.typingOn();
				await context.setState({ assuntos: await db.getAssuntos(context.state.CCS.cod_ccs) });
				if (context.state.assuntos.length === 0) {
					await context.sendText(flow.subjects.emptyAssuntos);
				} else { // TODO This will be updated to receive a link to a PDF
					await context.sendText(`${flow.subjects.firstMessage} ${context.state.assuntos.join('\n- ').replace(/,(?=[^,]*$)/, ' e')}.`);
				}
				// await context.sendText(flow.subjects.firstMessage);
				// await attach.sendCard(context, flow.subjects);
				await context.sendText(flow.subjects.thirdMessage, await attach.getQR(flow.subjects));
				await context.typingOff();
				break;
			case 'results':
				await attach.sendCard(context, flow.results);
				await context.sendText(flow.results.secondMessage, await attach.getQR(flow.results));
				break;
			case 'join':
				await context.sendText(flow.join.firstMessage, await attach.getQR(flow.join));
				break;
			case 'keepMe':
				await context.sendText(flow.keepMe.firstMessage, await attach.getQR(flow.keepMe));
				break;
			case 'share':
				await context.sendText(flow.share.firstMessage);
				await attach.sendShare(context, flow.share);
				await context.sendText(flow.share.secondMessage, await attach.getQR(flow.share));
				break;
			case 'followMedia':
				await attach.sendCard(context, flow.followMedia);
				// falls through
			case 'userData':
				await context.sendText(flow.userData.menuMessage, await attach.getQR(flow.userData));
				break;
			case 'eMail':
				await context.sendText(flow.userData.eMail);
				break;
			case 'reAskPhone':
				await context.sendText(flow.phone.firstMessage, await attach.getQR(flow.phone));
				break;
			case 'whatsApp':
				await context.sendText(flow.userData.whatsApp);
				await context.sendText(flow.userData.phoneExample);
				break;
			case 'gotPhone':
				await context.sendText('Guardamos seu telefone! Como posso te ajudar?', await attach.getQR(flow.userData));
				break;
			case 'errorText':
				await context.sendButtonTemplate(`Oi, ${context.session.user.first_name} ${context.session.user.last_name}.${flow.error.noText}`, [{
					type: 'postback',
					title: flow.error.menuOptions[0],
					payload: flow.error.menuPostback[0],
				}]);
				break;
			case 'findLocation': {
				await context.typingOn();
				googleMapsClient.reverseGeocode({
					latlng: [context.state.geoLocation.lat, context.state.geoLocation.long],
					language: 'pt-BR',
				}).asPromise().then(async (response) => {
					await userDataArray.push({
						userId: context.session.user.id,
						neighborhood: await getNeighborhood(response.json.results[0].address_components),
						address: response.json.results[0].formatted_address,
						geoLocation: response.json.results[0].geometry.location,
					});
					await context.typingOff();
					await context.sendText(`${flow.confirmLocation.firstMessage}\n${response.json.results[0].formatted_address}`);
					await context.sendText(flow.foundLocation.secondMessage, await attach.getQR(flow.foundLocation));
				}).catch(async (err) => {
					await context.typingOff();
					await console.log('Couldn\'t get geolocation => ');
					await console.log(err);
					await context.sendText(flow.confirmLocation.noFindGeo);
					await context.sendText(flow.confirmLocation.noSecond, await attach.getQR(flow.notFound));
				});
				break;
			}
			case 'confirmLocation':
				await context.typingOn();
				googleMapsClient.geocode({
					address: `${context.state.address}, ${addressComplement}`,
					region: 'BR',
					language: 'pt-BR',
				}).asPromise().then(async (response) => {
					if (response.json.results[0].formatted_address.trim() !== defaultAddress) {
						await userDataArray.push({
							userId: context.session.user.id,
							neighborhood: await getNeighborhood(response.json.results[0].address_components),
							address: response.json.results[0].formatted_address,
							geoLocation: response.json.results[0].geometry.location,
						});

						await context.sendText(`${flow.confirmLocation.firstMessage}\n${response.json.results[0].formatted_address}`);
						await context.typingOff();
						await context.sendText(flow.foundLocation.secondMessage, await attach.getQR(flow.confirmLocation));
					} else { // empty => falls into the default adress
						await context.sendText(`${flow.confirmLocation.noFirst} "${context.state.address}".`);
						await context.sendText(flow.confirmLocation.noSecond, await attach.getQR(flow.notFound));
					}
				}).catch(async (err) => {
					await context.typingOff();
					console.log(`Couldn't get geolocation => ${err}`);
					await context.sendText(`${flow.confirmLocation.noFirst} "${context.state.address}".`);
					await context.sendText(flow.confirmLocation.noSecond, await attach.getQR(flow.notFound));
				});
				break;
			}
		}
	} catch (err) {
		const date = new Date();
		console.log(`Parece que aconteceu um erro as ${date.toLocaleTimeString('pt-BR')} de ${date.getDate()}/${date.getMonth() + 1} =>`);
		console.log(err);
		console.log('\n');

		// await context.sendText('Parece que aconteceu um erro');
		await context.sendText(`Erro: ${flow.whichCCS.thirdMessage}`, await attach.getQR(flow.whichCCS));
	}
};