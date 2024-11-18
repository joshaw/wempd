"use strict";

// Global variables ///////////////////////////////////////////////////////////
const NOTIFICATION_TIMEOUT = 3000;
const REFRESH_INTERVAL = 5000;

function svg_icon(svg) {
	return `<svg class="svg-icon" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

const play_icon = svg_icon('<path d="M1,0 L10,5 L1,9 z" />');
const pause_icon = svg_icon('<path d="M0,0 H3 V10 H0 z M6,0 H9 V10 H6 z" />');
const stop_icon = svg_icon('<path d="M1,1 H9 V9 H1 z" />');
const prev_icon = svg_icon('<path d="M0,5 L5,0 V10 z M5,5 L10,0 L10,10 z" />');
const next_icon = svg_icon('<path d="M0,0 L5,5 L0,10 z M5,0 L10,5 L5,10 z" />');
const refresh_icon = svg_icon('<path d="M10,4 H4 L7,7.5 M8,5 A4,4,-0,1,0,4,9 L4,7.5 A2.5,2.5,-0,1,1,6.5,5" />');
const info_icon = svg_icon('<path d="M2,3 H6 V8 H9 V10 H1 V8 H4 V5 H2 z" /><circle cx="4.5" cy="1.3" r="1.3" />');
const add_icon = svg_icon('<path d="M1,4 H4 V1 H6 V4 H9 V6 H6 V9 H4 V6 H1" />');
const append_icon = svg_icon('<path d="M0,4 H3 V1 H5 V4 H7.5 V6 H5 V9 H3 V6 H0 M8,1 H10 V9 H8" />');
const down_icon = svg_icon('<path d="M1,4 H9 V6 H1" />');
const save_icon = svg_icon('<path d="M4,0 V5.5 L2,3.7 L1,5 L4,8 H0 V10 H10 V8 H6 L9,5 L8,3.7 L6,5.6 V0" />');
const up_icon = add_icon;
const remove_icon = down_icon;
const delete_icon = svg_icon('<path d="M1,2 V3 H2 V10 H8 V3 H9 V2 H6 L5.5,1.5 H4.5 L4,2 M3,9 v-5.5 h1 v5.5 M6,9 v-5.5 h1 v5.5" />');

const single_icon = svg_icon('<path d="M1.5,9 V7 H4 V3.2 L2,4.2 V2 L4,1 H6 V7 H8 V9" />');
const random_icon = svg_icon('<path d="M1,1 H9 V9 H1 z M3.5,2 A1.5,1.5 0 1,0 3.5,5 M3.5,5 A1.5,1.5 0 1,0 3.5,2 M6.5,5 A1.5,1.5 0 1,0 6.5,8 M6.5,8 A1.5,1.5 0 1,0 6.5,5" />');
const repeat_icon = svg_icon('<path d="M0,6 H6 L3,2.5 M2,5 A4,4,-0,1,0,6,1 L6,2.5 A2.5,2.5,-0,1,1,3.5,5" />');
const consume_icon = svg_icon('<path d="M10 2.5 A4.5 4.5 0 1 0 10 7.5 L 5.5 5 Z" />');

// Utility functions //////////////////////////////////////////////////////////
function isArray(a) {
	return Object.prototype.toString.call(a) === "[object Array]";
}

function strftime(sFormat, date) {
	// https://github.com/thdoan/strftime
	const nDay = date.getDay();
	const nDate = date.getDate();
	const nMonth = date.getMonth();
	const nYear = date.getFullYear();
	const nHour = date.getHours();
	const aDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const aMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const zeroPad = (nNum, nPad) => String((10 ** nPad) + nNum).slice(1);

	return sFormat.replace(/%[a-z]/ugi, (sMatch) => String({
		'%A': aDays[nDay],
		'%B': aMonths[nMonth],
		'%H': zeroPad(nHour, 2),
		'%I': zeroPad(((nHour + 11) % 12) + 1, 2),
		'%M': zeroPad(date.getMinutes(), 2),
		'%P': (nHour < 12) ? 'am' : 'pm',
		'%S': zeroPad(date.getSeconds(), 2),
		'%Y': nYear,
		'%a': aDays[nDay].slice(0, 3),
		'%b': aMonths[nMonth].slice(0, 3),
		'%d': zeroPad(nDate, 2),
		'%e': nDate,
		'%k': nHour,
		'%l': ((nHour + 11) % 12) + 1,
		'%m': zeroPad(nMonth + 1, 2),
		'%n': nMonth + 1,
		'%p': (nHour < 12) ? 'AM' : 'PM',
		'%s': Math.round(date.getTime()/1000),
		'%y': String(nYear).slice(2),
	}[sMatch] || '') || sMatch);
}

function plural(count, single, multiple) {
	return `${count} ${count === 1 ? single : multiple}`;
}

function sentenceCase(orig_str) {
	const str = orig_str.toLowerCase().split(' ');
	for (let i=0; i<str.length; i++) {
		str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
	}
	return str.join(' ');
}

function format_secs(orig_duration) {
	const duration = Number(orig_duration);
	if (! (typeof duration === 'number' && isFinite(duration))) {
		return '-';
	}

	let temp = duration;
	const yrs = Math.floor( temp / 31536000 );
	const days = Math.floor( ( temp %= 31536000 ) / 86400 );
	const hrs = Math.floor( ( temp %= 86400 ) / 3600 );
	const mins = Math.floor( ( temp %= 3600 ) / 60 );
	const secs = Math.floor( temp % 60 );

	return ( yrs ? yrs + ' years ' : '' ) +
		( days ? days + ' days ' : '' ) +
		( hrs ? hrs + ':' : '' ) +
		('0' + mins).slice(-2) + ':' +
		('0' + secs).slice(-2);
}

function url_with_params(url, params = {}) {
	if (!params || Object.keys(params).length === 0)
		return url;
	return url + '?' + Object.entries(params)
		.filter(([k, v]) => v)
		.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
		.join('&');
}

function wait(ms) {
	return new Promise((func) => setTimeout(func, ms));
}

function debounce(func, wait) {
	let timeout;
	return () => {
		const context = this;
		const args = arguments;
		const later = function() {
			timeout = null;
			func.apply(context, args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
};

// Network functions //////////////////////////////////////////////////////////
function fetch_json(url, params) {
	//console.error('fetch json, ', url);
	return fetch(url_with_params("api/" + url, params), {method: 'GET'})
		.then((result) => {
			if (result.ok) { return result.json(); }

			result.json().then((resp) => show_error(resp.error));
			return result;
		});
}

function fetch_blob(url, params) {
	//console.error('fetch blob, ', url);
	return fetch(url_with_params("api/" + url, params), {'method': 'GET'})
		.catch((error) => {
			show_error(`Cannot connect to server: ${error}`);
			return {};
		});
}

function post_json(url, data) {
	//console.error('post json, ', url);
	return fetch("api/" + url, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(data),
		})
		.then((result) => {
			if (result.ok) { return result.json(); }

			result.json().then((resp) => {
				show_error(resp.error);
				throw Promise.reject(resp.error);
			});
			return result;
		});
}

// Element functions //////////////////////////////////////////////////////////
function E(tag, attributes, children) {
	const elem = document.createElement(tag)

	if (children === undefined && attributes?.constructor !== Object) {
		children = attributes
		attributes = null
	}

	for (const key in attributes || {}) {
		const value = attributes[key]
		if (value === null || value === undefined)
			continue

		if (key.startsWith("on")) {
			elem.addEventListener(key.slice(2), value, false)
		} else if (typeof value === "boolean") {
			if (value) elem.setAttribute(key, "")
		} else {
			elem.setAttribute(key, value);
		}
	}

	if (children == null || children == undefined) {
		//
	} else if (children instanceof Array) {
		elem.append(...children.filter(x => x !== undefined && x !== null))
	} else {
		elem.append(children)
	}
	return elem
}

function parseHTML(html) {
	const template = document.createElement('template');
	template.innerHTML = html.trim();
	return template.content.firstChild;
}

function create_table_row(cells, is_header) {
	if (! cells)
		return E('tr', parseHTML('<td>&nbsp;</td>'));
	return E('tr', cells.map(c => E(is_header ? 'th' : 'td', c || '')));
}

function highlight(what) {
	for (const type in what) {
		const value = what[type];
		const list = document.getElementById(type + '-list');
		for (const a of list.children) {
			if (a.innerText === value) {
				remove_class_add(list, a, 'selected');
				a.scrollIntoView({behavior: 'smooth', block: 'center'});
				break;
			}
		}
	}
}

// Interface functions ////////////////////////////////////////////////////////
function show_error(msg) {
	const error_el = document.getElementById('error-message');
	error_el.textContent = msg;
	error_el.style.display = 'inherit';

	if (window.error_message_timeout)
		clearTimeout(window.error_message_timeout);

	window.error_message_timeout = wait(3500).then(() => error_el.style.display = 'none');
}

function draw_context_menu(x, y, items) {
	const cmenu = document.getElementById('context_menu');
	cmenu.replaceChildren(...items.map(item => E('p', {onclick: item.command}, item.title)));

	cmenu.style.display = 'initial';
	cmenu.style.left = x + 'px';
	cmenu.style.top = y + 'px';

	const win_width = window.innerWidth;
	const win_height = window.innerHeight;
	const cmenu_width = cmenu.offsetWidth;
	const cmenu_height = cmenu.offsetHeight;

	if (y + cmenu_height > win_height)
		cmenu.style.top = (win_height - cmenu_height) + 'px';
	if (x + cmenu_width > win_width)
		cmenu.style.left = (win_width - cmenu_width) + 'px';
}

function hide_context_menu() {
	const cmenu = document.getElementById('context_menu');
	cmenu.style.display = 'none';
	cmenu.replaceChildren();
}

function notify(content, icon) {
	const new_p = E('p', {class: "hflex"}, [parseHTML(icon), content])

	const logger = document.getElementById('logger');
	logger.insertBefore(new_p, logger.firstElementChild);

	new_p.addEventListener('click', () => {
		new_p.classList.add('removing');
		wait(130).then(() => new_p.remove());
	});

	wait(NOTIFICATION_TIMEOUT).then(() => {
		new_p.classList.add('removing');
		wait(130).then(() => new_p.remove());
	});
}

function display_modal(content) {
	const modal = document.getElementById('modal');
	modal.replaceChildren(
		E('div', {class: "modal_content"}, content),
		E('button', {class: "close_button", onclick: hide_modal}, parseHTML('&#x2A2F')),
	);
	modal.style.display = 'flex';

	document.getElementById('modal_background').style.display = 'initial';
}

function hide_modal(event) {
	if (event?.type === 'keyup' && event?.key !== 'Escape')
		return;

	const modal = document.getElementById('modal');
	modal.style.display = 'none';
	modal.replaceChildren();

	document.getElementById('modal_background').style.display = 'none';
}

function get_info_panel(info) {
	const explicit_rows = [
		['track', null],
		['name', null],
		['title', locate_title],
		['album', locate_album],
		['artist', locate_artist],
		['albumartist', locate_albumartist],
	];

	const mb_url = 'https://musicbrainz.org';
	const info_table = E('table', [
		...explicit_rows
			.filter(([key, func]) => info[key])
			.map(([key, func]) => create_table_row([
				sentenceCase(key),
				func ? E('a', {href: '#', onclick: () => func(info)}, info[key]) : info[key]
			])),
		create_table_row(),
		...Object.entries(info)
			.filter(([key, value]) => !explicit_rows.map(x => x[0]).includes(key))
			.sort((a,b) => a[0].localeCompare(b[0]))
			.map(([key, value]) => {
				switch (key) {
					case 'musicbrainz_artistid':
						return ['MusicBrainz Artist ID', E('a', {href: `${mb_url}/artist/${value}`}, value)];
					case 'musicbrainz_albumartistid':
						return ['MusicBrainz Album Artist ID', E('a', {href: `${mb_url}/artist/${value}`}, value)];
					case 'musicbrainz_albumid':
						return ['MusicBrainz Album ID', E('a', {href: `${mb_url}/album/${value}`}, value)];
					case 'musicbrainz_trackid':
						return ['MusicBrainz Track ID', E('a', {href: `${mb_url}/recording/${value}`}, value)];
					case 'musicbrainz_releasetrackid':
						return ['MusicBrainz Release Track ID', E('a', {href: `${mb_url}/track/${value}`}, value)];
					case 'duration':
						return ['duration', `${format_secs(value)} (${value} secs)`];
					case 'id':
					case 'pos':
					case 'time':
						return [key, null]
					default:
						return [key, value];
				}
			}).filter(([key, el]) => el).map(row => create_table_row(row)),
	]);

	if (window.currentsong.album === info.album && albumart) {
		const albumart = document.getElementById('albumart').cloneNode();
		albumart.style.float = 'left';
		albumart.style.maxWidth = '300px';
		albumart.style.paddingRight = '10px';

		return E('div', {}, [albumart, info_table]);
	}

	return info_table;
}

function show_info_panel(info) {
	display_modal(get_info_panel(info));
}

function create_table(rows, opts={}) {
	return E('table', {id: opts.id}, E('tbody', rows.map(row => create_table_row(row))))
}

function get_and_show_stats(do_auto_refresh=true) {
	return fetch_json('stats').then((stats) => {
		const updated_date = new Date(Number(stats.db_update)*1000);
		const updated_date_str = strftime('%a %e %b %H:%M %Y', updated_date);
		const update_ago = format_secs((new Date() - updated_date) / 1000) + ' ago';
		const updating = stats.updating_db ? ` (Updating, #${stats.updating_db})`: '';
		const db_updated = `${updated_date_str} (${update_ago}) ${updating}`

		display_modal(E('div', {}, [
			create_table([
				['Artists', Number(stats.artists).toLocaleString()],
				['Albums', Number(stats.albums).toLocaleString()],
				['Songs', Number(stats.songs).toLocaleString()],
			]),
			E('br'),
			create_table([
				['Uptime', format_secs(stats.uptime)],
				['Playtime', format_secs(stats.playtime)],
				['DB Playtime', format_secs(stats.db_playtime)],
				['DB Updated', db_updated],
			], {id: 'stats_table'}),
			E('br'),
			create_table([['Version', stats.mpd_version]]),
			E('br'),
			E('div', {class: 'btn_container'}, [
				E('button', {onclick: () => get_and_show_stats(false)}, parseHTML(refresh_icon)),
				E('button', {onclick: () => post_json('update').then(() => {
					notify('Starting DB update', refresh_icon);
					window.update_in_progress = true;
					get_and_show_stats(false);
				})}, 'Update DB'),
				E('button', {
					title: 'Show summary of songs',
					onclick: () => get_and_show_summary(),
				}, 'Summary'),
			]),
		]));

		if (do_auto_refresh)
			wait(2000).then(() => {
				if (document.getElementById('stats_table'))
					get_and_show_stats();
			});
	});
}

function populate_song_info(all_status) {
	const {currentsong, status} = all_status;

	if (!currentsong || !status) return;

	window.currentsong = currentsong;

	const display_name = currentsong.title || currentsong.name || currentsong.file;
	document.title = display_name ? `♫ ${display_name} - ${currentsong.artist || ''}` : 'MPD';

	// Album Art
	if (currentsong.file) {
		if (window.cur_file !== currentsong.file) {
			window.cur_file = currentsong.file;
			wait(100).then(() => fetch_blob('art', {file: currentsong.file})
				.then((resp) => (resp.status === 200) ? resp.blob() : null)
				.then(set_albumart));
		}
	} else {
		set_albumart(null);
	}

	// Title
	document.getElementById('cur_title').replaceChildren(currentsong.title
		? E('a', {href: '#', onclick: () => locate_title(currentsong)}, currentsong.title)
		: currentsong.name || currentsong.file || ""
	);

	// Album
	document.getElementById('cur_album').replaceChildren(currentsong.album
		? E('a', {href: '#', onclick: () => locate_album(currentsong)}, currentsong.album)
		: ""
	);

	// Artist
	document.getElementById('cur_artist').replaceChildren(artist_links(currentsong));

	const cur_song_info = document.getElementById('cur_song_info');
	cur_song_info.onclick = () => { show_info_panel(currentsong); };

	const cur_song_elapsed = document.getElementById('cur_song_elapsed');
	cur_song_elapsed.textContent = format_secs(status.elapsed);

	const cur_song_duration_el = document.getElementById('cur-song-duration');
	cur_song_duration_el.textContent = "-" + format_secs(status.duration - status.elapsed);

	const cur_song_progess_el = document.getElementById('cur_song_progress');
	cur_song_progess_el.value = status.elapsed;
	cur_song_progess_el.max = currentsong.duration;

	clearInterval(window.progress_timeout);
	if (status.state === 'play') {
		cur_song_progess_el.disabled = false;
		window.progress_timeout = setInterval(() => {
			const new_progress = Math.min(Number(cur_song_progess_el.value) + 0.2, status.duration);
			cur_song_progess_el.value = new_progress;
			cur_song_elapsed.textContent = format_secs(new_progress);
			cur_song_duration_el.textContent = "-" + format_secs(status.duration - new_progress);
		}, 200);
	} else {
		window.progress_timeout = null;
		if (status.state === 'stop') {
			cur_song_progess_el.value = 0;
			cur_song_progess_el.disabled = true;
		}
	}

	const volume_slider = document.getElementById('volume_slider');
	const volume_down = document.getElementById('volume_down');
	const volume_up = document.getElementById('volume_up');
	if (status.volume) {
		volume_slider.value = status.volume;
		volume_slider.disabled = false;
		volume_down.disabled = false;
		volume_up.disabled = false;
	} else {
		volume_slider.value = 0;
		volume_slider.disabled = true;
		volume_down.disabled = true;
		volume_up.disabled = true;
	}

	const volume_label = document.getElementById('volume_label');
	volume_label.textContent = status.volume;

	const pause_button = document.getElementById('pause_button');
	pause_button.innerHTML = status.state === 'play' ? pause_icon : play_icon;

	document.getElementById('repeat_value').checked = (status.repeat === '1');
	document.getElementById('random_value').checked = (status.random === '1');
	document.getElementById('single_value').checked = (status.single === '1');
	document.getElementById('consume_value').checked = (status.consume === '1');
}

// TODO: move
function artist_links(song, el) {
	if (song.artist === song.albumartist) {
		const locate_func = window.artist_mode === 'artist' ? locate_artist : locate_albumartist
		return E('a', {href: '#', onclick: () => locate_func(song)}, song.artist || '')

	} else if (window.artist_mode === 'artist') {
		return E('span', {}, [
			E('a', {href: '#', onclick: () => locate_artist(song)}, song.artist || ''),
			` (${song.albumartist || ''})`,
		])
	}

	return E('span', {}, [
		song.artist || '',
		' (',
		E('a', {href: '#', onclick: () => locate_albumartist(song)}, song.albumartist || ''),
		')',
	])
}

function populate_search_results(queue) {
	return [
		create_table_row(['Title', 'Album', 'Artist'], true),
		...queue.map(song => create_table_row([
			E('a', {href: '#', onclick: () => locate_title(song)}, song.title || song.name || song.file),
			E('a', {href: '#', onclick: () => locate_album(song)}, song.album),
			artist_links(song),
		]))
	];
}

function get_and_show_outputs() {
	fetch_json('outputs').then(outputs => {
		display_modal(E('div', {}, outputs.sort((a, b) => a.outputid - b.outputid).map(output => {
			const input_id = output.outputname.replace(/[^a-zA-Z0-9]/ug, "");
			return E('p', {class: 'outputs_modal'}, [
				E('input', {
					type: 'checkbox',
					id: input_id,
					checked: output.outputenabled === "1",
					onchange: event => {
						if (event.target.checked) {
							post_json('enableoutput', {outputid: output.outputid})
								.then(() => notify(`Enabled output "${output.outputname}"`, ""));
						} else {
							post_json('disableoutput', {outputid: output.outputid})
								.then(() => notify(`Disabled output "${output.outputname}"`, ""));
						}
					}
				}),
				E('label', {for: input_id}, E('span', {}, output.outputname)),
				E('span', {'data-type': "plugin"}, output.plugin),
				...(output.attribute?.map(attr => parseHTML(`<span>${attr}</span>`)) || []),
			]);
		})))
	});
}

function update_search_results(results) {
	document.getElementById('search-summary').innerText = `Results (${results.length})`;
	document.getElementById('results-table').replaceChildren(...populate_search_results(results));
}

function show_search_results(results, query) {
	display_modal(E('div', [
		E("p", {id: 'header'}, [
			E('span', {id: 'search-summary'}, `Results (${results.length}):`),
			E('form', {
				class: 'btn_container',
				onsubmit: (e) => {
					e.preventDefault();
					const query = e.target.elements.query.value;
					if (!query || query.length === 0) { return; }
					fetch_json('search', {query}).then((resp) => update_search_results(resp, query));
				},
				oninput: debounce((e) => {
					const query = e.target.value;
					if (!query || query.length <= 3) { return; }
					fetch_json('search', {query}).then((resp) => update_search_results(resp, query));
				}, 200),
			}, [
				E('input', {type: 'text', name: 'query', value: query}),
				E('button', {type: 'submit'}, 'Search'),
			]),
		]),
		E('table', {id: 'results-table'},
			populate_search_results(results.sort((a, b) => a.title.localeCompare(b.title)))
		)
	]));
}

// Music functions ////////////////////////////////////////////////////////////
function create_list_item(text, buttons) {
	return E('p', {class: 'hover-display-wrapper'}, [
		E('span', text),
		buttons.length == 3
			? E('span', {class: 'btn_container hover-display'}, [
				E('button', {onclick: buttons[0], title: 'Show information'}, [parseHTML(info_icon), ' ']),
				E('button', {onclick: buttons[1], title: 'Add after current'}, [parseHTML(add_icon), ' ']),
				E('button', {onclick: buttons[2], title: 'Add at end'}, [parseHTML(append_icon), ' ']),
			])
			: null,
	]);
}

function remove_class_add(div, el_add, c) {
	Array.from(div.getElementsByClassName(c)).forEach(el => el.classList.remove(c))
	el_add.classList.add(c);
}

function populate_list(list, list_div, opts) {
	const items = []
	if (opts.display_ALL) {
		// TODO All item click
		const item = create_list_item(
			`-- All (${list.length}) --`,
			[
				/*
				() => insert_to_queue({[window.artist_mode]: artist}),
				() => append_to_queue({[window.artist_mode]: artist}),
				() => highlight({artist: list[Math.floor(Math.random() * list.length)]}),
				*/
			]
		);
		item.addEventListener('click', () => {
			remove_class_add(list_div, item, 'selected');
			opts.onclick_all();
		});
		items.push(item);
	}

	items.push(...list.map(info => {
		const selected_info = opts.info_selector(info);
		const item = create_list_item(
			opts.item_text(info),
			[
				() => { if (opts.info_display) { opts.info_display(selected_info); } },
				() => insert_to_queue(selected_info),
				() => append_to_queue(selected_info),
			]
		);
		if (opts.onclick) {
			item.addEventListener('click', () => {
				remove_class_add(list_div, item, 'selected');
				opts.onclick(info);
			});
		}
		return item;
	}));
	list_div.replaceChildren(...items);
}

// Titles
function locate_title(song) {
	if (! (song.album || song[window.artist_mode])) { return; }
	hide_modal();
	set_display_mode('library').then(() => {
		highlight({artist: song[window.artist_mode]});

		get_albums(
			{[window.artist_mode]: song[window.artist_mode]},
			{highlight: song.album}
		);

		get_titles(
			{[window.artist_mode]: song[window.artist_mode], album: song.album},
			{highlight: song.title}
		);
	});
}

function clear_titles() {
	document.getElementById('title-list').replaceChildren();
}

function get_titles(what, opts={}) {
	return fetch_json('titles', what)
		.then((titles) => {
			if (opts.sort)
				titles.sort((a, b) => a.title.localeCompare(b.title));
			populate_titles(titles);
		})
		.then(() => {
			if (opts.highlight)
				highlight({title: opts.highlight});
		});
}

function populate_titles(titles) {
	const list_div = document.getElementById('title-list');
	populate_list(titles, list_div, {
		display_ALL: false,
		item_text: (info) => info.title || info.name || info.file || 'No name',
		info_selector: (info) => info,
		info_display: (info) => fetch_json('info', info).then(show_info_panel),
		onclick: (info) => {
			if (window.display_mode === 'artist')
				fetch_json('info', info).then(show_info_panel);
		},
	});
}

// Albums
function locate_album(song) {
	if (window.display_mode === 'playlists') {
		set_display_mode('artist').then(() => highlight({artist: song[window.artist_mode]}));
	} else {
		highlight({artist: song[window.artist_mode]});
	}

	get_albums({[window.artist_mode]: song[window.artist_mode]}, {highlight: song.album});
	get_titles({[window.artist_mode]: song[window.artist_mode], album: song.album});
	hide_modal();
}

function clear_albums() {
	document.getElementById('album-list').replaceChildren();
}

function locate_playlist(name) {
	if (window.display_mode === 'playlists') {
		get_playlists({highlight: name});
	} else {
		set_display_mode('playlists').then(() => highlight({album: name}));
	}
	get_titles({playlist: name});
	hide_modal();
}

function get_playlists(opts={}) {
	return fetch_json('playlists').then((playlists) => {
		if (opts.clear_titles) {
			clear_titles();
		}

		populate_albums(null, playlists);

		if (opts.highlight) {
			highlight({album: opts.highlight});
		}
		return playlists;
	});
}

function get_albums(what, opts={}) {
	return fetch_json('albums', what).then((albums) => {
		if (opts.clear_titles) {
			clear_titles();
		}

		populate_albums(what[window.artist_mode], albums);

		if (opts.highlight) {
			highlight({album: opts.highlight});
		}
		return albums;
	});
}

// TODO move
function album_artist_info_display(info) {
	fetch_json('count', info).then((results) => {
		info.songs = results.songs;
		info.playtime = format_secs(results.playtime);
		display_modal(E('div', [
			get_info_panel(info),
			E('div', {class: 'btn_container'}, [
				E('button', {onclick: () => insert_to_queue(info)}, 'Insert'),
				E('button', {onclick: () => append_to_queue(info)}, 'Append'),
			]),
		]));
	});
}

function remove_playlist(name) {
	return post_json('removeplaylist', {playlist: name})
		.then((results) => notify(`Removed playlist, ${results.removed}`, delete_icon))
		.then(get_playlists);
}

function playlist_info_display(info) {
	display_modal(E('div', [
		E('table', [create_table_row(['Playlist', info.playlist])]),
		E('div', {class: 'btn_container'}, [
			E('button', {class: 'hflex', onclick: () => insert_to_queue(info)}, [parseHTML(add_icon), 'Insert']),
			E('button', {class: 'hflex', onclick: () => append_to_queue(info)}, [parseHTML(append_icon), 'Append']),
			E('button', {class: 'hflex', onclick: () => remove_playlist(info.playlist).then(hide_modal)}, [parseHTML(delete_icon), 'Delete']),
		]),
	]));
}

function populate_albums(artist, albums) {
	const list_div = document.getElementById('album-list');

	if (window.display_mode === 'playlists') {
		populate_list(albums, list_div, {
			display_ALL: false,
			info_display: playlist_info_display,
			item_text: (info) => info,
			info_selector: (info) => ({playlist: info}),
			onclick: (info) => get_titles({playlist: info}),
		});
	} else {
		populate_list(albums, list_div, {
			display_ALL: true,
			onclick_all: () => get_titles({[window.artist_mode]: artist}, {sort: true}),
			info_display: album_artist_info_display,
			item_text: (info) => info === '' ? '<empty string>' : info,
			info_selector: (info) => ({[window.artist_mode]: artist, album: info}),
			onclick: (info) => get_titles({[window.artist_mode]: artist, album: info}),
		});
	}
}

// Artists
function locate_artist(song) {
	set_display_mode('library').then(() => highlight({artist: song.artist}));
	get_albums({artist: song.artist});
	hide_modal();
}

function random_artist() {
	const list = document.getElementById('artist-list').children;
	const item = list[Math.floor(Math.random() * list.length)].innerText;
	highlight({artist: item});
}

function locate_albumartist(song) {
	set_display_mode('library').then(() => highlight({artist: song.albumartist}));
	get_albums({albumartist: song.albumartist}, {clear_titles: true});
	hide_modal();
}

function clear_artists() {
	document.getElementById('artist-list').replaceChildren();
}

function get_artists() {
	switch (window.artist_mode) {
		case 'artist':
			return fetch_json('artists').then(populate_artists);
		case 'albumartist':
			return fetch_json('albumartists').then(populate_artists);
		default:
			throw new Error(window.artist_mode);
	}
}

function populate_artists(artists) {
	populate_list(artists, document.getElementById('artist-list'), {
		display_ALL: true,
		onclick_all: () => get_albums({}),
		info_display: album_artist_info_display,
		item_text: (info) => info === '' ? '<empty string>' : info,
		info_selector: (info) => ({[window.artist_mode]: info}),
		onclick: (info) => get_albums({[window.artist_mode]: info}, {clear_titles: true}),
	});
}

// Queue
function move_song(from_id, to_pos) {
	post_json('move', {from: from_id, to: to_pos}).then(update_queue);
}

function populate_queue(queue) {
	document.getElementById('queue').replaceChildren(
		create_table_row(['', 'Title', 'Album', 'Artist', 'Length'], true),
		...queue.map(song => E('tr', {class: song.current ? 'current' : null}, [
			E('td', song.track || ''),
			E('td', {
				oncontextmenu: (e) => {
					e.preventDefault();
					draw_context_menu(e.x, e.y, [
						{title: 'Remove song', command: () => remove_from_queue({ids: [song.pos]})},
					]);
				},
			}, E('a', {href: '#', onclick: () => locate_title(song)}, song.title || song.name || song.file)),
			E('td', {
				oncontextmenu: (e) => {
					e.preventDefault();
					draw_context_menu(e.x, e.y, [
						{title: 'Remove album', command: () => remove_from_queue({album: song.album})},
					]);
				}
			}, E('a', {href: '#', onclick: () => locate_album(song)}, song.album)),
			E('td', {
				oncontextmenu: (e) => {
					e.preventDefault();
					draw_context_menu(e.x, e.y, [
						{title: 'Remove artist', command: () => remove_from_queue({artist: song.artist})},
						{title: 'Remove album artist', command: () => remove_from_queue({albumartist: song.albumartist})},
					]);
				}
			}, artist_links(song)),
			E('td', E('span', format_secs(song.duration))),
			E('td', E('span', {class: 'hflex'}, [
				E('button', {
					class: 'hflex',
					onclick: () => song.current === 'play' ? pause() : post_json('play', {id: song.pos}).then(refresh),
				}, parseHTML(song.current === 'play' ? pause_icon : play_icon)),
				E('button', {
					class: 'hflex',
					onclick: () => show_info_panel(song),
				}, parseHTML(info_icon)),
				E('button', {
					class: 'hflex',
					title: 'Move song up',
					onclick: () => move_song(Number(song.pos), Number(song.pos) - 1),
				}, parseHTML('&#9650;')),
				E('button', {
					class: 'hflex',
					title: 'Move song down',
					onclick: () => move_song(Number(song.pos), Number(song.pos) + 1),
				}, parseHTML('&#9660;')),
			])),
		])),
	);
}

function update_queue() {
	return fetch_json('queue').then(populate_queue);
}

function remove_from_queue(what) {
	post_json('remove', what)
		.then((e) => {
			notify(`Removed ${plural(e.removed, 'song', 'songs')}`, remove_icon);
			update_queue();
		});
}

function insert_to_queue(what) {
	post_json('insert', what)
		.then((e) => {
			notify(`Inserted ${plural(e.inserted, 'song', 'songs')}`, add_icon);
			update_queue();
		});
}

function append_to_queue(what) {
	post_json('append', what)
		.then((e) => {
			notify(`Appended ${plural(e.appended, 'song', 'songs')}`, append_icon);
			update_queue();
		});
}

// Action functions ///////////////////////////////////////////////////////////
function set_display_mode(mode) {
	switch (mode) {
		case 'playlists':
		case 'library':
			document.getElementById(`${mode}_mode`).checked = true;
			break;
		default:
			throw new Error(mode);
	}

	set_param("mode", mode);
	if (window.display_mode === mode) {
		return Promise.resolve();
	}
	window.display_mode = mode;

	clear_titles();

	switch (mode) {
		case 'playlists':
			clear_artists();
			return get_playlists();
		case 'library':
			clear_albums();
			return get_artists();
		default:
			throw new Error();
	}
}

function toggle_theme() {
	document.documentElement.classList.toggle('alt-theme');
}

function set_artist_mode(mode) {
	if (window.artist_mode === mode)
		return Promise.resolve();
	window.artist_mode = mode;

	clear_albums();
	clear_titles();
	update_queue();
	return get_artists();
}

function check_db_update(info) {
	const update_id = parseInt(info.status.updating_db) || -1;

	if (update_id >= 0)
		window.update_in_progress = update_id;

	if (!window.update_in_progress && update_id >= 0) {
		window.update_in_progress = update_id;
		notify(`DB update, ${update_id} started`, refresh_icon);

	} else if (window.update_in_progress && update_id < 0) {
		notify(`DB update, ${window.update_in_progress}, complete`, refresh_icon);
		window.update_in_progress = null;
	}
}

function auto_populate(queue) {
	if (window.auto_populate_enabled && queue.length < 3) {
		fetch_json('albums')
			.then(albums => albums[Math.floor(Math.random() * albums.length)])
			.then(album => {
				append_to_queue({'album': album});
				console.log('Auto populate playlist', album);
			});
	}
}

function refresh() {
	return fetch_json('status')
		.then((info) => {
			populate_queue(info.queue);
			populate_song_info(info);
			check_db_update(info);
			auto_populate(info.queue);
			return info;
		});
}

function pause() { post_json('pause').then(refresh); }
function stop() { post_json('stop').then(refresh); }
function next() { post_json('next').then(refresh); }
function prev() { post_json('prev').then(refresh); }

function adjust_volume(change) {
	const volume_slider = document.getElementById("volume_slider");
	const volume_label = document.getElementById("volume_label");
	volume_slider.value = Number(volume_slider.value) + change;
	volume_label.textContent = volume_slider.value;

	post_json('volume', {volume: change})
		.then((result) => {
			volume_slider.value = result.volume;
			volume_label.textContent = result.volume;
		});
}

function set_albumart(blob) {
	const img = document.getElementById('albumart');
	if (blob) {
		const objurl = URL.createObjectURL(blob);
		img.src = objurl;
		img.style.display = 'initial';
		img.style.cursor = 'pointer';
	} else {
		img.src = '';
		img.style.display = 'none';
		img.style.cursor = 'initial';
	}
}

function set_bool_option(mode, value) {
	var icon;
	switch (mode) {
		case 'consume':
			icon = consume_icon;
			break;
		case 'single':
			icon = single_icon;
			break;
		case 'random':
			icon = random_icon;
			break;
		case 'repeat':
			icon = repeat_icon;
			break;
		default:
			console.error('Unknown mode option, %s', mode);
			return;
	}
	const msg = `${value ? 'Enabled' : 'Disabled'} ${mode} mode`;
	post_json(mode, {enabled: value ? '1' : '0'})
		.then(() => notify(msg, icon));
}

function clear_queue() {
	post_json('clear').then((resp) => {
		notify(`Removed ${resp.removed} songs`, remove_icon);
		update_queue();
	});
}

function clear_queue_before_current() {
	const cur_pos = parseInt(window.currentsong.pos);
	post_json('delete', {from: 0, to: cur_pos}).then((resp) => {
		notify(`Removed ${resp.removed} songs`, remove_icon);
		update_queue();
	});
}

function clear_queue_except_current() {
	const cur_pos = parseInt(window.currentsong.pos);
	post_json('delete', {from: cur_pos+1, to: 1e9}).then((resp1) => {
		post_json('delete', {from: 0, to: cur_pos}).then((resp2) => {
			notify(`Removed ${resp1.removed + resp2.removed} songs`, remove_icon);
			update_queue();
		});
	});
}

function shuffle_queue() {
	post_json('shuffle').then(update_queue);
}

function set_param(key, value) {
	const url = new URL(window.location.href);
	url.searchParams.set(key, value);
	window.history.replaceState(null, "", url.href);
}

function set_auto_update(value) {
	if (value) { // Enable
		if (! window.update_interval) {
			clearInterval(window.update_interval);
			window.update_interval = setInterval(refresh, REFRESH_INTERVAL);
			refresh();
			console.log('Created interval, ', window.update_interval);
		}
		set_param("auto", 1);

	} else { // Disable
		if (window.update_interval) {
			console.log('Clearing interval, ', window.update_interval);
			clearInterval(window.update_interval);
		}
		window.update_interval = null;
		set_param("auto", 0);
	}
}

function get_and_show_summary(field='artist', sort_by='playtime') {
	display_modal(E("div", "Loading summary ..."));

	fetch_json('count', {group: field}).then((results) => {
		if (!results) { return; }

		const summary = results[field].map((x, i) => ({
			[field]: x,
			songs: results.songs[i],
			playtime: results.playtime[i],
			average: (results.playtime[i] / results.songs[i]),
		}));
		summary.sort((a, b) => b[sort_by] - a[sort_by]);

		display_modal(E('div', [
			E('div', {class: 'btn_container'},
				['albumartist', 'artist', 'album', 'title', 'genre'].flatMap(label => [
					E('input', {
						type: 'radio',
						name: 'summary_field',
						id: label,
						checked: label === field,
						onchange: () => get_and_show_summary(label)
					}),
					E('label', {for: label}, sentenceCase(label)),
				]),
			),
			E('br'),
			E('table', [
				create_table_row([sentenceCase(field), 'Count', 'Duration', 'Average'], true),
				...summary.map(entry => create_table_row([
					entry[field],
					entry.songs,
					format_secs(entry.playtime),
					format_secs(entry.average),
				])),
			]),
		]));
	});
}

function setup() {
	// Only called on page init
	const params = new URLSearchParams(window.location.search);

	document.getElementById('pause_button').innerHTML = pause_icon;
	document.getElementById('stop_button').innerHTML = stop_icon;
	document.getElementById('prev_button').innerHTML = prev_icon;
	document.getElementById('next_button').innerHTML = next_icon;
	document.getElementById('auto_update_button').innerHTML = refresh_icon;
	document.getElementById('cur_song_info').innerHTML = info_icon;
	document.getElementById('volume_down').innerHTML = down_icon;
	document.getElementById('volume_up').innerHTML = up_icon;
	document.getElementById('single_label').innerHTML = single_icon + ' Single';
	document.getElementById('random_label').innerHTML = random_icon + ' Random';
	document.getElementById('repeat_label').innerHTML = repeat_icon + ' Repeat';
	document.getElementById('consume_label').innerHTML = consume_icon + ' Consume';

	window.addEventListener('keyup', hide_modal);
	document.getElementById('modal_background').addEventListener('click', hide_modal);

	// Album art view
	const albumart = document.getElementById('albumart');
	albumart.addEventListener('click', () => {
		show_info_panel(currentsong);
	});

	// Progress meter and label
	const progress_el = document.getElementById('cur_song_progress');
	progress_el.addEventListener('change', (event) => {
		post_json('seek', {time: event.target.value});
	});

	const elapsed_el = document.getElementById('cur_song_elapsed');
	progress_el.addEventListener('input', (event) => {
		elapsed_el.textContent = format_secs(event.target.value);
	});

	// Volume Slider and label
	const volume_slider = document.getElementById('volume_slider');
	volume_slider.addEventListener('change', (event) => {
		post_json('volume', {setvol: event.target.value});
	});

	const volume_label = document.getElementById('volume_label');
	volume_slider.addEventListener('input', (event) => {
		volume_label.textContent = event.target.value;
	});

	document.getElementById('volume_down').addEventListener('click', (event) => {
		adjust_volume(event.shiftKey ? -5 : -1);
	});

	document.getElementById('volume_up').addEventListener('click', (event) => {
		adjust_volume(event.shiftKey ? +5 : +1);
	});

	// Search form
	const search_form = document.getElementById('search_form');
	search_form.addEventListener('submit', (e) => {
		e.preventDefault();
		const query = e.target.elements.query.value;
		if (!query || query.length === 0) { return; }
		fetch_json('search', {query})
			.then((results) => show_search_results(results, query));
	});

	// Add form
	const add_form = document.getElementById('add_form');
	add_form.addEventListener('submit', (e) => {
		e.preventDefault();
		const entry = e.target.elements.entry.value;
		if (entry.length > 0) {
			post_json('add', {entry})
				.catch((here) => console.log('ERROR!', here))
				.then((info) => notify(`Added ${info.added}`, add_icon))
				.then(update_queue);
				// TODO error handling
		}
	});

	// Save form
	const save_form = document.getElementById('save_form');
	save_form.addEventListener('submit', (e) => {
		e.preventDefault();
		const entry = e.target.elements.entry.value;
		if (entry.length > 0) {
			post_json('save', {name: entry})
				.then(() => notify(`Saved playlist, ${entry}`, save_icon))
				.then(() => locate_playlist(entry));
		}
	});

	set_artist_mode('albumartist');

	// Auto update
	const auto_update_input = document.getElementById('auto_update_input');
	if (params.has("auto")) {
		auto_update_input.checked = params.get("auto") == "1";
	}
	set_auto_update(auto_update_input.checked);

	// Display Mode
	if (params.has("mode")) {
		const mode = params.get("mode")
		if (mode == "playlists" || mode == "library") {
			set_display_mode(mode);
		}
	}

	// Support resizing the queue.
	const resizer = document.getElementById("resizer");
	const queue = document.getElementById("queue_wrapper");

	function resize(e) {
		const queue_bottom = queue.getBoundingClientRect().bottom;
		const resize_height = resizer.getBoundingClientRect().height;
		const new_height = queue_bottom - e.y - resize_height;

		const size = `${new_height}px`;
		queue.style.maxHeight = size;
	}

	resizer.addEventListener("mousedown", (event) => {
		document.body.style.userSelect = "none";
		document.addEventListener("mousemove", resize, false);
		document.addEventListener("mouseup", () => {
			document.body.style.userSelect = "initial";
			document.removeEventListener("mousemove", resize, false);
		}, false);
	});
}

window.cur_file = null;
window.display_mode = 'library';
window.addEventListener('load', () => {
	setup();
	refresh()
		.then((info) => locate_title(info.currentsong))
		.then(() => document.querySelector('#queue .current')?.scrollIntoView());
});

window.addEventListener('click', hide_context_menu);
window.addEventListener('keyup', (e) => {
	if (e.target.tagName === 'INPUT' && e.target.type === 'text') { return; }

	switch (e.key) {
		case ' ':
		case 'p':
			pause();
			break;
		case 'ArrowUp':
			adjust_volume(event.shiftKey ? +1 : +5)
			break;
		case 'ArrowDown':
			adjust_volume(event.shiftKey ? -1 : -5)
			break;
		case 'ArrowRight':
			next();
			break;
		case 'ArrowLeft':
			prev();
			break;
		default:
			break;
	}
});
