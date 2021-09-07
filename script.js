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
const info_icon = svg_icon('<path d="M2,3 H6 V8 H9 V10 H1 V8 H4 V5 H2 z"></path><circle cx="4.5" cy="1.3" r="1.3"></circle>');
const add_icon = svg_icon('<path d="M1,4 H4 V1 H6 V4 H9 V6 H6 V9 H4 V6 H1"></path>');
const append_icon = svg_icon('<path d="M0,4 H3 V1 H5 V4 H7.5 V6 H5 V9 H3 V6 H0 M8,1 H10 V9 H8"></path>');
const down_icon = svg_icon('<path d="M1,4 H9 V6 H1"></path>');
const up_icon = add_icon;

const single_icon = svg_icon('<path d="M2,9 V7 H4 V3.2 L2,4.2 V2 L4,1 H6 V7 H8 V9"></path>');
const random_icon = svg_icon('<path d="M1,1 H9 V9 H1 z M3.5,2 A1.5,1.5 0 1,0 3.5,5 M3.5,5 A1.5,1.5 0 1,0 3.5,2 M6.5,5 A1.5,1.5 0 1,0 6.5,8 M6.5,8 A1.5,1.5 0 1,0 6.5,5"></path>');
const repeat_icon = svg_icon('<path d="M0,6 H6 L3,2.5 M2,5 A4,4,-0,1,0,6,1 L6,2.5 A2.5,2.5,-0,1,1,3.5,5"></path>');
const consume_icon = svg_icon('<path d="M2.6,1 L5,3.4 L7.4,1 L9,2.6 L6.6,5 L9,7.4 L7.4,9 L5,6.6 L2.6,9 L1,7.4 L3.4,5 L1,2.6"></path>');

// Utility functions //////////////////////////////////////////////////////////
function isArray(a) {
	return Object.prototype.toString.call(a) === "[object Array]";
}

function strftime(sFormat, date=new Date()) {
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
	if (!params || Object.keys(params).length === 0) {
		return url;
	}

	const kv = [];
	for (const key in params) {
		const value = params[key];
		if (value || value === false) {
			kv.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
		}
	}
	return url + '?' + kv.join('&');
}

function wait(ms) {
	return new Promise((func) => setTimeout(func, ms));
}

// Network functions //////////////////////////////////////////////////////////
function fetch_json(url, params) {
	//console.error('fetch json, ', url);
	return fetch(url_with_params(url, params), {method: 'GET'})
		.then((result) => {
			if (result.ok) { return result.json(); }

			result.json().then((resp) => show_error(resp.error));
			return result;
		});
}

function fetch_blob(url, params) {
	//console.error('fetch blob, ', url);
	return fetch(url_with_params(url, params), {'method': 'GET'})
		.catch((error) => {
			show_error(`Cannot connect to server: ${error}`);
			return {};
		});
}

function post_json(url, data) {
	//console.error('post json, ', url);
	return fetch(url, {
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
function remove_children(el) {
	while (el.lastChild) {
		el.removeChild(el.lastChild);
	}
}

function make(desc) {
	if (!isArray(desc)) { throw new Error(); }

	const [name, attributes] = desc;
	const el = document.createElement(name);

	let start = 1;
	if (typeof attributes === "object" && attributes !== null && !isArray(attributes)) {
		for (const attr in attributes) {
			el[attr] = attributes[attr];
		}
		start = 2;
	}

	for (let i = start; i < desc.length; i++) {
		if (isArray(desc[i])) {
			el.appendChild(make(desc[i]));
		} else {
			el.appendChild(document.createTextNode(desc[i]));
		}
	}

	return el;
}

function parseHTML(html) {
	const template = document.createElement('template');
	template.innerHTML = html.trim();
	return template.content.firstChild;
}

function create_table_row(cells, is_header) {
	const row = document.createElement('tr');
	if (! cells) {
		row.appendChild(parseHTML('<td>&nbsp;</td>'));
		return row;
	}

	for (let i=0; i<cells.length; i++) {
		const td = document.createElement(is_header ? 'th' : 'td');
		const cell = cells[i] || '';
		if (typeof(cell) === 'string') {
			td.textContent = cell;
		} else {
			td.appendChild(cell);
		}
		row.appendChild(td);
	}
	return row;
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

	if (window.error_message_timeout) {
		clearTimeout(window.error_message_timeout);
	}

	window.error_message_timeout = wait(3500).then(() => {
		error_el.style.display = 'none';
	});
}

function draw_context_menu(x, y, items) {
	const cmenu = document.getElementById('context_menu');
	remove_children(cmenu);
	for (let i=0; i<items.length; i++) {
		const item = items[i];
		const item_p = document.createElement('p');
		item_p.textContent = item.title;
		item_p.addEventListener('click', item.command);
		cmenu.appendChild(item_p);
	}

	cmenu.style.display = 'initial';
	cmenu.style.left = x + 'px';
	cmenu.style.top = y + 'px';

	const win_width = window.innerWidth;
	const win_height = window.innerHeight;
	const cmenu_width = cmenu.offsetWidth;
	const cmenu_height = cmenu.offsetHeight;

	if (y + cmenu_height > win_height) {
		cmenu.style.top = (win_height - cmenu_height) + 'px';
	}
	if (x + cmenu_width > win_width) {
		cmenu.style.left = (win_width - cmenu_width) + 'px';
	}
}

function hide_context_menu() {
	const cmenu = document.getElementById('context_menu');
	cmenu.style.display = 'none';
	remove_children(cmenu);
}

function notify(content) {
	const logger = document.getElementById('logger');
	const new_p = document.createElement('p');
	new_p.textContent = content;
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
	remove_children(modal);

	const div = parseHTML('<div class="modal_content"></div>');
	div.appendChild(content);
	modal.appendChild(div);

	const close_modal_btn = parseHTML('<button class="close_button">&#x2A2F;</button>');
	close_modal_btn.addEventListener('click', hide_modal);
	modal.appendChild(close_modal_btn);
	modal.style.display = 'flex';

	document.getElementById('modal_background').style.display = 'initial';
}

function hide_modal(event) {
	if (event && event.type === 'keyup' && event.key !== 'Escape') {
		return;
	}

	const modal = document.getElementById('modal');
	modal.style.display = 'none';
	remove_children(modal);

	document.getElementById('modal_background').style.display = 'none';
}

function get_info_panel(info) {
	const info_table = document.createElement('table');
	const explicit_rows = ['name', 'title', 'album', 'artist'];

	if (info.artist !== info.albumartist) {
		explicit_rows.push('albumartist');
	}

	if (info.track) {
		info_table.appendChild(create_table_row(['Track', info.track || '']));
	}

	for (const key of explicit_rows) {
		let value = info[key];
		if (!value) { continue; }

		value = document.createElement('a');
		value.href = '#';

		switch (key) {
			case 'title':
				value.textContent = info.title;
				value.addEventListener('click', () => locate_title(info));
				break;
			case 'album':
				value.textContent = info.album;
				value.addEventListener('click', () => locate_album(info));
				break;
			case 'artist':
				value.textContent = info.artist;
				value.addEventListener('click', () => locate_artist(info));
				break;
			case 'albumartist':
				value.textContent = info.albumartist;
				value.addEventListener('click', () => locate_albumartist(info));
				break;
			default:
				break;
		}

		info_table.appendChild(create_table_row([sentenceCase(key), value]));
	}

	info_table.appendChild(create_table_row());

	explicit_rows.push('track');
	const mb_url = 'https://musicbrainz.org';
	for (let key of Object.keys(info).sort()) {
		if (explicit_rows.includes(key)) { continue; }

		let value = info[key];

		switch (key) {
			case 'musicbrainz_artistid':
				key = 'MusicBrainz Artist ID';
				value = make(['a', {href: `${mb_url}/artist/${value}`}, value]);
				break;
			case 'musicbrainz_albumartistid':
				if (value === info['musicbrainz_artistid']) {
					value = null;
				} else {
					key = 'MusicBrainz Album Artist ID';
					value = make(['a', {href: `${mb_url}/artist/${value}`}, value]);
				}
				break;
			case 'musicbrainz_albumid':
				key = 'MusicBrainz Album ID';
				value = make(['a', {href: `${mb_url}/album/${value}`}, value]);
				break;
			case 'musicbrainz_trackid':
				key = 'MusicBrainz Track ID';
				value = make(['a', {href: `${mb_url}/recording/${value}`}, value]);
				break;
			case 'musicbrainz_releasetrackid':
				key = 'MusicBrainz Release Track ID';
				value = make(['a', {href: `${mb_url}/track/${value}`}, value]);
				break;
			case 'duration':
				value = `${format_secs(value)} (${value} secs)`;
				break
			case 'id':
			case 'pos':
			case 'time':
				value = null;
				break
			default:
				break;
		}

		if (value) {
			info_table.appendChild(create_table_row([key, value]));
		}
	}

	const albumart = document.getElementById('albumart').cloneNode();
	if (window.currentsong.album === info.album && albumart) {
		albumart.style.float = 'left';
		albumart.style.maxWidth = '300px';
		albumart.style.paddingRight = '10px';

		const div = document.createElement("div");
		div.appendChild(albumart);
		div.appendChild(info_table);
		return div;
	}

	return info_table;
}

function show_info_panel(info) {
	display_modal(get_info_panel(info));
}

function create_table(rows, opts={}) {
	const tbl = document.createElement('table');
	if (opts.id) {
		tbl.id = opts.id;
	}
	for (const row of rows) {
		tbl.appendChild(create_table_row(row));
	}
	return tbl;
}

function get_and_show_stats(do_auto_refresh=true) {
	return fetch_json('stats').then((stats) => {
		const div = document.createElement('div');
		div.appendChild(create_table([
			['Artists', Number(stats.artists).toLocaleString()],
			['Albums', Number(stats.albums).toLocaleString()],
			['Songs', Number(stats.songs).toLocaleString()],
		]));

		div.appendChild(document.createElement('br'));

		const updated_date = new Date(Number(stats.db_update)*1000);
		const updated_date_str = strftime('%a %e %b %H:%M %Y', updated_date);
		const update_ago = format_secs((new Date() - updated_date) / 1000) + ' ago';
		const updating = stats.updating_db ? ` (Updating, #${stats.updating_db})`: '';
		div.appendChild(create_table([
			['Uptime', format_secs(stats.uptime)],
			['Playtime', format_secs(stats.playtime)],
			['DB Playtime', format_secs(stats.db_playtime)],
			['DB Updated', `${updated_date_str} (${update_ago}) ${updating}`],
		], {id: 'stats_table'}));

		div.appendChild(document.createElement('br'));

		div.appendChild(create_table([['Version', stats.mpd_version]]));
		div.appendChild(document.createElement('br'));

		const buttons = document.createElement('div');
		buttons.classList.add('btn_container');

		const refresh_button = document.createElement('button');
		refresh_button.innerHTML = refresh_icon;
		refresh_button.addEventListener('click', () => get_and_show_stats(false));
		buttons.appendChild(refresh_button);

		const update_button = document.createElement('button');
		update_button.textContent = 'Update DB';
		update_button.addEventListener('click', () => {
			post_json('update').then(() => {
				notify('Starting DB update');
				window.update_in_progress = true;
				get_and_show_stats(false);
			});
		});
		buttons.appendChild(update_button);

		const summary_btn = document.createElement('button');
		summary_btn.textContent = 'Summary';
		summary_btn.title = 'Show summary of songs';
		summary_btn.addEventListener('click', () => get_and_show_summary());
		buttons.appendChild(summary_btn);

		div.appendChild(buttons);

		display_modal(div);

		if (do_auto_refresh) {
			wait(2000).then(() => {
				if (document.getElementById('stats_table')) {
					get_and_show_stats();
				}
			});
		}
	});
}

function populate_song_info(all_status) {
	const {currentsong, status} = all_status;

	if (!currentsong || !status) { return; }

	window.currentsong = currentsong;

	const cur_title = currentsong.title;
	const cur_name = currentsong.name;
	const cur_file = currentsong.file;
	const cur_album = currentsong.album;

	const display_name = cur_title || cur_name || cur_file;

	if (cur_title || cur_name || cur_file) {
		document.title = `♫ ${display_name} - ${currentsong.artist || ''}`;
	} else {
		document.title = 'MPD';
	}

	// Album Art
	if (cur_file) {
		if (!window.cur_file || window.cur_file !== cur_file) {
			window.cur_file = cur_file;
			fetch_blob('art', {file: cur_file})
				.then((resp) => (resp.status === 200) ? resp.blob() : null)
				.then(set_albumart);
		}
	} else {
		set_albumart(null);
	}

	// Title
	const cur_title_el = document.getElementById('cur_title');
	remove_children(cur_title_el);
	if (cur_title) {
		cur_title_el.appendChild(make(['a', {href: '#', onclick: () => locate_title(currentsong)}, cur_title]));
	} else if (cur_name || cur_file) {
		cur_title_el.appendChild(document.createTextNode(cur_name || cur_file));
	}

	// Album
	const cur_album_el = document.getElementById('cur_album');
	remove_children(cur_album_el);
	if (cur_album) {
		cur_album_el.appendChild(make([
			'a',
			{href: '#', onclick: () => locate_album(currentsong)},
			cur_album,
		]));
	}

	// Artist
	const cur_artist_el = document.getElementById('cur_artist');
	remove_children(cur_artist_el);
	append_artist_links(currentsong, cur_artist_el);

	const cur_song_info = document.getElementById('cur_song_info');
	cur_song_info.onclick = () => { show_info_panel(currentsong); };

	const cur_song_elapsed = document.getElementById('cur_song_elapsed');
	cur_song_elapsed.textContent = format_secs(status.elapsed);

	const cur_song_duration_el = document.getElementById('cur-song-duration');
	cur_song_duration_el.textContent = format_secs(status.duration);

	const cur_song_progess_el = document.getElementById('cur_song_progress');
	cur_song_progess_el.value = status.elapsed;
	cur_song_progess_el.max = currentsong.duration;

	if (status.state === 'play') {
		cur_song_progess_el.disabled = false;
		if (! window.progress_timeout) {
			window.progress_timeout = () => {
				const new_progress = Number(cur_song_progess_el.value) + 0.1;
				cur_song_progess_el.value = new_progress;
				cur_song_elapsed.textContent = format_secs(new_progress);

				wait(100).then(window.progress_timeout);
			};
			window.progress_timeout();
		}
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
function append_artist_links(song, el) {
	if (song.artist === song.albumartist) {
		const link = document.createElement('a');
		link.textContent = song.artist || '';
		link.href = '#';
		if (window.artist_mode === 'artist') {
			link.addEventListener('click', () => locate_artist(song));
		} else {
			link.addEventListener('click', () => locate_albumartist(song));
		}
		el.appendChild(link);

	} else {
		const link = document.createElement('a');
		link.href = '#';

		if (window.artist_mode === 'artist') {
			link.textContent = song.artist || '';
			link.addEventListener('click', () => locate_artist(song));
			el.appendChild(link);
			el.appendChild(document.createTextNode(' ('));
			el.appendChild(document.createTextNode(song.albumartist || ''));
			el.appendChild(document.createTextNode(')'));

		} else {
			link.textContent = song.albumartist || '';
			link.addEventListener('click', () => locate_albumartist(song));
			el.appendChild(document.createTextNode(song.artist || ''));
			el.appendChild(document.createTextNode(' ('));
			el.appendChild(link);
			el.appendChild(document.createTextNode(')'));
		}
	}
}

function populate_search_results(queue, table) {
	remove_children(table);
	table.appendChild(create_table_row(['Title', 'Album', 'Artist'], true));

	for (let i=0; i<queue.length; i++) {
		const song = queue[i];
		const song_tr = document.createElement('tr');

		{ // Title column
			const link = document.createElement('a');
			link.textContent = song.title || song.name || song.file;
			link.href = '#';
			link.addEventListener('click', () => locate_title(song));

			const td = document.createElement('td');
			td.appendChild(link);
			song_tr.appendChild(td);
		}

		{ // Album column
			const link = document.createElement('a');
			link.textContent = song.album;
			link.href = '#';
			link.addEventListener('click', () => locate_album(song));

			const td = document.createElement('td');
			td.appendChild(link);
			song_tr.appendChild(td);
		}

		{ // Artist column
			const td = document.createElement('td');
			append_artist_links(song, td);
			song_tr.appendChild(td);
		}

		table.appendChild(song_tr);
	}
}

function get_and_show_outputs() {
	fetch_json('outputs').then((outputs) => {
		const div = document.createElement('div');
		for (const output of outputs.sort((a, b) => a.outputid - b.outputid)) {
			const p = document.createElement('p');
			p.classList.add('outputs_modal');

			const enabled = document.createElement('input');
			enabled.type = 'checkbox';
			const input_id = output.outputname.replace(/[^a-zA-Z0-9]/ug, "");
			enabled.id = input_id;
			enabled.checked = output.outputenabled === "1";
			enabled.addEventListener('change', () => {
				console.log(output);
				if (enabled.checked) {
					post_json('enableoutput', {outputid: output.outputid})
						.then(() => notify(`Enabled output "${output.outputname}"`));
				} else {
					post_json('disableoutput', {outputid: output.outputid})
						.then(() => notify(`Disabled output "${output.outputname}"`));
				}
			});
			p.appendChild(enabled);

			const label = document.createElement('label');
			label.setAttribute("for", input_id);
			label.appendChild(make(['span', output.outputname]));
			p.appendChild(label);

			p.appendChild(parseHTML(`<span data-type="plugin">${output.plugin}</span>`));
			if (output.attribute) {
				for (const attr of output.attribute) {
					p.appendChild(parseHTML(`<span>${attr}</span>`));
				}
			}

			div.appendChild(p);
		}

		display_modal(div);
	});
}

function show_search_results(results, query) {
	const summary = parseHTML(`<p class="summary">Results (${results.length}):</p>`);

	const search_form = document.createElement('form');
	search_form.classList.add('btn_container');
	search_form.value = query;
	search_form.addEventListener('submit', (e) => {
		e.preventDefault();
		const form_query = e.target.elements.query.value;
		if (!form_query || form_query.length === 0) { return; }
		fetch_json('search', {query: form_query, field: 'title'})
			.then((resp) => show_search_results(resp, form_query));
	});

	search_form.innerHTML = `
		<input type="text" name="query">
		<button type="submit">Search</button>
	`;
	search_form.children[0].value = query;

	summary.appendChild(search_form);

	const div = document.createElement('div');
	div.appendChild(summary);

	const table = document.createElement('table');
	populate_search_results(results.sort((a, b) => a.title > b.title), table);
	div.appendChild(table);

	display_modal(div);
}

// Music functions ////////////////////////////////////////////////////////////
function create_list_item(text, buttons) {
	const item_p = document.createElement('p');
	item_p.classList.add('hover-display-wrapper');

	const item_span = document.createElement('span');
	item_span.textContent = text;

	const btn_span = document.createElement('span');
	btn_span.classList.add('btn_container');
	btn_span.classList.add('hover-display');

	for (let i=0; i<buttons.length; i++) {
		const button_cb = buttons[i];
		const btn = document.createElement('button');

		switch (i) {
			case 0:
				btn.innerHTML = info_icon;
				btn.title = 'Show information';
				break;
			case 1:
				btn.innerHTML = add_icon;
				btn.title = 'Add after current';
				break;
			case 2:
				btn.innerHTML = append_icon;
				btn.title = 'Add at end';
				break;
			default:
				break;
		}

		btn.addEventListener('click', (event) => {
			event.stopPropagation();
			button_cb();
		});
		btn_span.appendChild(btn);
		btn_span.appendChild(document.createTextNode(' '));
	}

	item_p.appendChild(item_span);
	item_p.appendChild(btn_span);

	return item_p;
}

function remove_class_add(div, el_add, c) {
	for (const el of div.getElementsByClassName(c)) {
		el.classList.remove(c);
	}
	el_add.classList.add(c);
}

function populate_list(list, list_div, opts) {
	remove_children(list_div);

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
		list_div.appendChild(item);
	}

	for (let i=0; i<list.length; i++) {
		const info = list[i];

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
		list_div.appendChild(item);
	}
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
	const titles_div = document.getElementById('title-list');
	remove_children(titles_div);
}

function get_titles(what, opts={}) {
	return fetch_json('titles', what)
		.then((titles) => {
			if (opts.sort) {
				titles.sort((a, b) => a.title.localeCompare(b.title));
			}
			populate_titles(titles);
		})
		.then(() => {
			if (opts.highlight) {
				highlight({title: opts.highlight});
			}
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
			if (window.display_mode === 'artist') {
				fetch_json('info', info).then(show_info_panel);
			}
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
	const albums_div = document.getElementById('album-list');
	remove_children(albums_div);
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

		const div = document.createElement('div');
		div.appendChild(get_info_panel(info));

		const btn_div = document.createElement('div');
		btn_div.classList.add('btn_container');

		const insert_btn = document.createElement('button');
		insert_btn.textContent = 'Insert';
		insert_btn.addEventListener('click', () => insert_to_queue(info));
		btn_div.appendChild(insert_btn);

		const append_btn = document.createElement('button');
		append_btn.textContent = 'Append';
		append_btn.addEventListener('click', () => append_to_queue(info));
		btn_div.appendChild(append_btn);

		div.appendChild(btn_div);
		display_modal(div);
	});
}

function remove_playlist(name) {
	return post_json('removeplaylist', {playlist: name})
		.then((results) => notify(`Removed playlist, ${results.removed}`))
		.then(get_playlists);
}

function playlist_info_display(info) {
	const div = document.createElement('div');

	const table = document.createElement('table');
	table.appendChild(create_table_row(['Playlist', info.playlist]));
	div.appendChild(table);

	const btn_div = document.createElement('div');
	btn_div.classList.add('btn_container');

	const insert_btn = document.createElement('button');
	insert_btn.textContent = 'Insert';
	insert_btn.addEventListener('click', () => insert_to_queue(info));
	btn_div.appendChild(insert_btn);

	const append_btn = document.createElement('button');
	append_btn.textContent = 'Append';
	append_btn.addEventListener('click', () => append_to_queue(info));
	btn_div.appendChild(append_btn);

	const rm_btn = document.createElement('button');
	rm_btn.textContent = 'Delete';
	rm_btn.addEventListener('click', () => remove_playlist(info.playlist).then(hide_modal));
	btn_div.appendChild(rm_btn);

	div.appendChild(btn_div);
	display_modal(div);
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
	if (window.display_mode === 'playlists') {
		set_display_mode('artist').then(() => highlight({artist: song.artist}));
	} else {
		highlight({artist: song.artist});
	}

	get_albums({artist: song.artist});
	hide_modal();
}

function random_artist() {
	const list = document.getElementById('artist-list').children;
	const item = list[Math.floor(Math.random() * list.length)].innerText;
	highlight({artist: item});
}

function locate_albumartist(song) {
	if (window.display_mode === 'playlists') {
		set_display_mode('artist').then(() => highlight({artist: song.albumartist}));
	} else {
		highlight({artist: song.albumartist});
	}

	get_albums({albumartist: song.albumartist}, {clear_titles: true});
	hide_modal();
}

function clear_artists() {
	const artists_div = document.getElementById('artist-list');
	remove_children(artists_div);
}

function get_artists() {
	switch (window.artist_mode) {
		case 'artist':
			return fetch_json('artists').then(populate_artists);
		case 'albumartist':
			return fetch_json('albumartists').then(populate_artists);
		default:
			throw new Error();
	}
}

function populate_artists(artists) {
	const list_div = document.getElementById('artist-list');
	populate_list(artists, list_div, {
		display_ALL: true,
		onclick_all: () => get_albums({}),
		info_display: album_artist_info_display,
		item_text: (info) => info === '' ? '<empty string>' : info,
		info_selector: (info) => ({[window.artist_mode]: info}),
		onclick: (info) => get_albums({[window.artist_mode]: info}, {clear_titles: true}),
	});
}

// Queue
function populate_queue(queue) {
	const queue_table = document.getElementById('queue');
	remove_children(queue_table);

	const header_tr = document.createElement('tr');
	header_tr.innerHTML = '<th>' + [
		'', 'Title', 'Album', 'Artist', 'Length'
	].join('</th><th>') + '</th>';

	queue_table.appendChild(header_tr);

	for (let i=0; i<queue.length; i++) {
		const song = queue[i];
		const song_tr = document.createElement('tr');

		{ // Track column
			const td = document.createElement('td');
			td.textContent = song.track || '';
			song_tr.appendChild(td);
		}

		{ // Title column
			const link = document.createElement('a');
			link.textContent = song.title || song.name || song.file;
			link.href = '#';
			link.addEventListener('click', () => locate_title(song));

			const td = document.createElement('td');
			td.appendChild(link);
			td.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				draw_context_menu(e.x, e.y, [
					{
						title: 'Remove song',
						command: () => remove_from_queue({ids: [song.pos]}),
					},
				]);
			});

			song_tr.appendChild(td);
		}

		{ // Album column
			const link = document.createElement('a');
			link.textContent = song.album;
			link.href = '#';
			link.addEventListener('click', () => locate_album(song));

			const td = document.createElement('td');
			td.appendChild(link);
			td.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				draw_context_menu(e.x, e.y, [
					{
						title: 'Remove album',
						command: () => remove_from_queue({album: song.album}),
					},
				]);
			});
			song_tr.appendChild(td);
		}

		{ // Albumartist column
			const td = document.createElement('td');
			append_artist_links(song, td);
			td.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				draw_context_menu(e.x, e.y, [
					{
						title: 'Remove artist',
						command: () => remove_from_queue({artist: song.artist})
					},
					{
						title: 'Remove album artist',
						command: () => remove_from_queue({albumartist: song.albumartist})
					},
				]);
			});
			song_tr.appendChild(td);
		}

		{ // Length column
			const td = document.createElement('td');

			const length_span = document.createElement('span');
			length_span.textContent = format_secs(song.duration);
			td.appendChild(length_span);
			song_tr.appendChild(td);
		}

		{
			const td = document.createElement('td');
			const btn_span = document.createElement('span');
			btn_span.classList.add('hflex');
			const toggle_btn = document.createElement('button');
			toggle_btn.classList.add('hflex');
			if (song.current === 'play') {
				toggle_btn.innerHTML = pause_icon;
				toggle_btn.addEventListener('click', pause);
			} else {
				toggle_btn.innerHTML = play_icon;
				toggle_btn.addEventListener('click', () => {
					post_json('play', {id: song.pos}).then(refresh);
				});
			}

			btn_span.appendChild(toggle_btn);

			const info_btn = document.createElement('button');
			info_btn.innerHTML = info_icon;
			info_btn.classList.add('hflex');
			info_btn.addEventListener('click', () => show_info_panel(song));
			btn_span.appendChild(info_btn);

			td.appendChild(btn_span);
			song_tr.appendChild(td);
		}

		if (song.current) {
			song_tr.classList.add('current');
		}

		queue_table.appendChild(song_tr);
	}
}

function update_queue() {
	return fetch_json('queue').then(populate_queue);
}

function remove_from_queue(what) {
	post_json('remove', what)
		.then((e) => {
			notify(`Removed ${plural(e.removed, 'song', 'songs')}`);
			update_queue();
		});
}

function insert_to_queue(what) {
	post_json('insert', what)
		.then((e) => {
			notify(`Inserted ${plural(e.inserted, 'song', 'songs')}`);
			update_queue();
		});
}

function append_to_queue(what) {
	post_json('append', what)
		.then((e) => {
			notify(`Appended ${plural(e.appended, 'song', 'songs')}`);
			update_queue();
		});
}

// Action functions ///////////////////////////////////////////////////////////
function set_display_mode(mode) {
	switch (mode) {
		case 'playlists':
			document.getElementById('playlists_mode').checked = true;
			break;
		case 'library':
			document.getElementById('library_mode').checked = true;
			break;
		default:
			throw new Error();
	}

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
	if (window.artist_mode === mode) {
		return Promise.resolve();
	}
	window.artist_mode = mode;

	clear_albums();
	clear_titles();
	return get_artists();
}

function check_db_update(info) {
	const update_id = parseInt(info.status.updating_db) || -1;

	if (update_id >= 0) {
		window.update_in_progress = update_id;
	}

	if (!window.update_in_progress && update_id >= 0) {
		window.update_in_progress = update_id;
		notify(`DB update, ${update_id} started`);

	} else if (window.update_in_progress && update_id < 0) {
		notify(`DB update, ${window.update_in_progress}, complete`);
		window.update_in_progress = null;
	}
}

function refresh() {
	update_queue();
	return fetch_json('status')
		.then((info) => {
			populate_song_info(info);
			check_db_update(info);
			return info;
		});
}

function pause() {
	post_json('pause').then(refresh);
}

function stop() {
	post_json('stop').then(refresh);
}

function next() {
	post_json('next').then(refresh);
}

function prev() {
	post_json('prev').then(refresh);
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

function set_option(mode, value) {
	switch (mode) {
		case 'consume':
		case 'single':
		case 'random':
		case 'repeat':
			break;
		default:
			console.error('Unknown mode option, %s', mode);
			return;
	}
	const msg = `${value ? 'Enabled' : 'Disabled'} ${mode} mode`;
	post_json(mode, {enabled: value ? '1' : '0'})
		.then(() => notify(msg));
}

function clear_queue() {
	post_json('clear').then((resp) => {
		notify(`Removed ${resp.removed} songs`);
		update_queue();
	});
}

function clear_queue_before_current() {
	const cur_pos = parseInt(window.currentsong.pos);
	post_json('delete', {from: 0, to: cur_pos}).then((resp) => {
		notify(`Removed ${resp.removed} songs`);
		update_queue();
	});
}

function clear_queue_except_current() {
	const cur_pos = parseInt(window.currentsong.pos);
	post_json('delete', {from: cur_pos+1, to: 1e9}).then((resp1) => {
		post_json('delete', {from: 0, to: cur_pos}).then((resp2) => {
			notify(`Removed ${resp1.removed + resp2.removed} songs`);
			update_queue();
		});
	});
}

function shuffle_queue() {
	post_json('shuffle').then(update_queue);
}

function set_auto_update(value) {
	if (value) { // Enable
		if (! window.update_interval) {
			clearInterval(window.update_interval);
			window.update_interval = setInterval(refresh, REFRESH_INTERVAL);
			refresh();
			console.log('Created interval, ', window.update_interval);
		}
	} else { // Disable
		if (window.update_interval) {
			console.log('Clearing interval, ', window.update_interval);
			clearInterval(window.update_interval);
		}
		window.update_interval = null;
	}
}

function get_and_show_summary(field='albumartist', sort_by='playtime') {
	fetch_json('count', {group: field}).then((results) => {
		if (!results) { return; }

		const summary = [];
		for (let i=0; i<results[field].length; i++) {
			summary.push({
				[field]: results[field][i],
				songs: results.songs[i],
				playtime: results.playtime[i],
				average: (results.playtime[i] / results.songs[i]),
			});
		}

		summary.sort((a, b) => b[sort_by] - a[sort_by]);

		const tbl = document.createElement('table');
		tbl.appendChild(create_table_row([sentenceCase(field), 'Count', 'Duration', 'Average'], true));

		for (const entry of summary) {
			tbl.appendChild(create_table_row([
				entry[field],
				entry.songs,
				format_secs(entry.playtime),
				format_secs(entry.average),
			]));
		}

		const btns_div = document.createElement('div');
		btns_div.classList.add('btn_container');
		for (const field_label of ['albumartist', 'artist', 'album', 'title', 'genre']) {
			const radio = document.createElement('input');
			radio.type = 'radio';
			radio.name = 'summary_field';
			radio.id = field_label;
			radio.addEventListener('change', () => get_and_show_summary(field_label));
			btns_div.appendChild(radio);
			radio.checked = field_label === field;

			const label = document.createElement('label');
			label.setAttribute("for", field_label);
			label.textContent = sentenceCase(field_label);
			btns_div.appendChild(label);
		}

		const div = document.createElement('div');
		div.appendChild(btns_div);
		div.appendChild(document.createElement('br'));
		div.appendChild(tbl);

		display_modal(div);
	});
}

function setup() {
	// Only called on page init

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
		//const clone = albumart.cloneNode();
		//display_modal(clone);
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
		const change = event.shiftKey ? -5 : -1;
		post_json('volume', {volume: change})
			.then((result) => {
				volume_slider.value = result.volume;
				volume_label.textContent = result.volume;
			});
	});

	document.getElementById('volume_up').addEventListener('click', (event) => {
		const change = event.shiftKey ? +5 : +1;
		post_json('volume', {volume: change})
			.then((result) => {
				volume_slider.value = result.volume;
				volume_label.textContent = result.volume;
			});
	});

	// Search form
	const search_form = document.getElementById('search_form');
	search_form.addEventListener('submit', (e) => {
		e.preventDefault();
		const query = e.target.elements.query.value;
		const field = e.target.elements.field.value;
		if (!query || query.length === 0) { return; }
		fetch_json('search', {field, query})
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
				.then((info) => notify(`Added ${info.added}`))
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
				.then(() => notify(`Saved playlist, ${entry}`))
				.then(() => locate_playlist(entry));
		}
	});

	set_artist_mode('albumartist');
	set_auto_update(document.getElementById('auto_update_input').checked);

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

window.display_mode = 'library';
window.addEventListener('load', () => {
	setup();
	refresh()
		.then((info) => locate_title(info.currentsong))
		.then(() => {
			const queue_cur = document.querySelector('#queue .current');
			if (queue_cur) { queue_cur.scrollIntoView(); }
		});
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
			post_json('volume', {volume: 5});
			break;
		case 'ArrowDown':
			post_json('volume', {volume: -5});
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
