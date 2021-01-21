// Global variables ///////////////////////////////////////////////////////////
//const play_icon = '\u9659'
const play_icon = '\u23F4\uFE0E';
const pause_icon = '\u23F8\uFE0E';
const NOTIFICATION_TIMEOUT = 3000;
const REFRESH_INTERVAL = 5000;

// Utility functions //////////////////////////////////////////////////////////
function isFunction(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
};

function isArray(a) {
	return Object.prototype.toString.call(a) === "[object Array]";
}

function strftime(sFormat, date) {
	// https://github.com/thdoan/strftime
	if (!(date instanceof Date)) {
		date = new Date();
	}
	const nDay = date.getDay()
	const nDate = date.getDate()
	const nMonth = date.getMonth()
	const nYear = date.getFullYear()
	const nHour = date.getHours()
	const aDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	const aMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	const zeroPad = (nNum, nPad) => ((Math.pow(10, nPad) + nNum) + '').slice(1);
	return sFormat.replace(/%[a-z]/gi, (sMatch) => {
		return (({
			'%a': aDays[nDay].slice(0,3),
			'%A': aDays[nDay],
			'%b': aMonths[nMonth].slice(0,3),
			'%B': aMonths[nMonth],
			'%d': zeroPad(nDate, 2),
			'%e': nDate,
			'%H': zeroPad(nHour, 2),
			'%I': zeroPad((nHour+11)%12 + 1, 2),
			'%k': nHour,
			'%l': (nHour+11)%12 + 1,
			'%m': zeroPad(nMonth + 1, 2),
			'%n': nMonth + 1,
			'%M': zeroPad(date.getMinutes(), 2),
			'%p': (nHour<12) ? 'AM' : 'PM',
			'%P': (nHour<12) ? 'am' : 'pm',
			'%s': Math.round(date.getTime()/1000),
			'%S': zeroPad(date.getSeconds(), 2),
			'%y': (nYear + '').slice(2),
			'%Y': nYear,
		}[sMatch] || '') + '') || sMatch;
	});
}

function plural(count, single, multiple) {
	return `${count} ${count == 1 ? single : multiple}`;
}

function format_secs(orig_duration) {
	const duration = Number(orig_duration);
	if (! (typeof duration === 'number' && isFinite(duration))) {
		return '-'
	}

	var temp = duration;
	const yrs  = Math.floor( temp / 31536000 )
	const days = Math.floor( ( temp %= 31536000 ) / 86400 )
	const hrs  = Math.floor( ( temp %= 86400 ) / 3600 )
	const mins = Math.floor( ( temp %= 3600 ) / 60 )
	const secs = Math.floor( temp % 60 );

	return ( yrs  ? yrs  + ' years ' : '' ) +
		( days ? days + ' days ' : '' ) +
		( hrs  ? hrs  + ':' : '' ) +
		('0' + mins).slice(-2) + ':' +
		('0' + secs).slice(-2);
}

function url_with_params(url, params = {}) {
	if (!params || Object.keys(params).length === 0) {
		return url
	}

	const kv = []
	for (var key in params) {
		const value = params[key];
		if (value !== null && value !== undefined) {
			kv.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
		}
	}
	return url + '?' + kv.join('&');
}

function wait(ms) {
	return new Promise(func => setTimeout(func, ms));
}

// Network functions //////////////////////////////////////////////////////////
function fetch_json(url, params) {
	//console.error('fetch json, ', url);
	return fetch(url_with_params(url, params), {'method': 'GET'})
		.then(result => {
			//console.log(result);
			if (! result.ok) { throw result; }
			return result.json();
		})
		.catch(error => {
			show_error('Cannot connect to server');
			return {};
		});
}

function fetch_blob(url, params) {
	//console.error('fetch blob, ', url);
	return fetch(url_with_params(url, params), {'method': 'GET'})
		.catch(error => {
			show_error('Cannot connect to server');
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
		.then(result => {
			if (! result.ok) { throw result; }
			//console.log(result);
			return result.json();
		})
		.catch(error => {
			console.log('Error: post_json()');
			console.log(error);
			show_error(error);
		});
}

// Element functions //////////////////////////////////////////////////////////
function remove_children(el) {
	while (el.lastChild) {
		el.removeChild(el.lastChild);
	}
}

function make(desc) {
	if (!isArray(desc)) {
		return make.call(this, Array.prototype.slice.call(arguments));
	}

	const name = desc[0];
	const attributes = desc[1];

	const el = document.createElement(name);

	var start = 1;
	if (typeof attributes === "object" && attributes !== null && !isArray(attributes)) {
		for (var attr in attributes) {
			el[attr] = attributes[attr];
		}
		start = 2;
	}

	for (var i = start; i < desc.length; i++) {
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

function create_table_row(cells) {
	const row = document.createElement('tr');
	if (! cells) {
		row.appendChild(parseHTML('<td>&nbsp;</td>'));
		return row
	}

	for (var i=0; i<cells.length; i++) {
		const td = document.createElement('td');
		if (typeof(cells[i]) === 'string') {
			td.textContent = cells[i];
		} else {
			td.appendChild(cells[i]);
		}
		row.appendChild(td);
	}
	return row;
}

function highlight(what) {
	for (type in what){
		const value = what[type];
		const list = document.getElementById(type + '-list');
		for (a of list.children) {
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
	for (var i=0; i<items.length; i++) {
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

function notify(...content) {
	const logger = document.getElementById('logger');
	const new_p = document.createElement('p');
	new_p.textContent = content.join(' ');
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

function show_info_panel(info) {
	const info_table = document.createElement('table');
	const explicit_rows = ['name', 'title', 'album', 'artist'];

	if (info.artist !== info.albumartist) {
		explicit_rows.push('albumartist');
	}

	if (info.track) {
		info_table.appendChild(create_table_row(['Track', info.track || '']));
	}

	for (var key of explicit_rows) {
		var value = info[key];
		if (!value) { continue; }

		const key_display = key.charAt(0).toUpperCase() + key.substr(1);

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
		}

		info_table.appendChild(create_table_row([key_display, value]));
	}

	info_table.appendChild(create_table_row());

	const mb_url = 'https://musicbrainz.org'
	for (var key of Object.keys(info).sort()) {
		if (explicit_rows.includes(key)) { continue; }

		var value = info[key];

		switch(key) {
		case 'musicbrainz_artistid':
			value = make(['a', {href: `${mb_url}/artist/${value}`}, value]);
			break;
		case 'musicbrainz_albumid':
			value = make(['a', {href: `${mb_url}/album/${value}`}, value]);
			break;
		case 'musicbrainz_trackid':
			value = make(['a', {href: `${mb_url}/recording/${value}`}, value]);
			break;
		}

		info_table.appendChild(create_table_row([key, value]));
	}

	display_modal(info_table);
}

function get_and_show_stats() {
	return fetch_json('/stats').then(stats => {
		const tbl = document.createElement('table');
		const tr = create_table_row;
		tbl.appendChild(tr(['Artists', Number(stats.artists).toLocaleString()]));
		tbl.appendChild(tr(['Albums', Number(stats.albums).toLocaleString()]));
		tbl.appendChild(tr(['Songs', Number(stats.songs).toLocaleString()]));
		tbl.appendChild(tr());
		tbl.appendChild(tr(['Uptime', format_secs(stats.uptime)]));
		tbl.appendChild(tr(['Playtime', format_secs(stats.playtime)]));
		tbl.appendChild(tr(['DB Playtime', format_secs(stats.db_playtime)]));

		const updated_date = new Date(Number(stats.db_update)*1000);
		tbl.appendChild(tr(['DB Updated', strftime('%a %e %b %H:%M %Y', updated_date)]));

		const update_ago = format_secs((new Date() - updated_date) / 1000) + ' ago';
		let updating = '';
		if (stats.updating_db) {
			updating = ` (Updating, #${stats.updating_db})`
		}
		tbl.appendChild(tr(['', update_ago + updating]));
		tbl.appendChild(tr());

		const div = document.createElement('div');
		div.appendChild(tbl);

		const buttons = document.createElement('div');
		buttons.classList.add('btn_container');

		const refresh_button = document.createElement('button');
		refresh_button.textContent = 'Refresh';
		refresh_button.textContent = '\u27F3\uFE0E';
		refresh_button.addEventListener('click', get_and_show_stats);
		buttons.appendChild(refresh_button);

		const update_button = document.createElement('button');
		update_button.textContent = 'Update DB';
		update_button.addEventListener('click', () => {
			post_json('/update').then(() => {
				notify('Starting DB update');
				window.update_in_progress = true;
			});
		});

		buttons.appendChild(update_button);

		div.appendChild(buttons);

		display_modal(div);
	});
}

function populate_song_info(all_status) {
	const currentsong = all_status.currentsong;
	const status = all_status.status;

	if (!currentsong || !status) { return; }

	window.currentsong = currentsong;
	document.title = 'MPD \u27a2 ' + all_status.connection;

	const cur_title = currentsong.title;
	const cur_name = currentsong.name;
	const cur_file = currentsong.file;
	const cur_artist = currentsong.artist;
	const cur_albumartist = currentsong.albumartist;
	const cur_album = currentsong.album;

	// Title
	const cur_title_el = document.getElementById('cur_title');
	remove_children(cur_title_el);
	if (cur_title) {
		cur_title_el.appendChild(make(['a', {href: '#', onclick: () => locate_title(currentsong)}, cur_title]));
	} else {
		cur_title_el.appendChild(document.createTextNode(cur_name || cur_file));
	}

	// Album
	const cur_album_el = document.getElementById('cur_album');
	remove_children(cur_album_el);
	if (cur_album) {
		cur_album_el.appendChild(make([
			'a',
			{href: '#', onclick: () => locate_album(currentsong)},
			cur_album
		]));
	}

	// Artist
	const cur_artist_el = document.getElementById('cur_artist');
	remove_children(cur_artist_el);
	append_artist_links(currentsong, cur_artist_el);

	if (cur_file) {
		if (!window.cur_file || window.cur_file !== cur_file) {
			window.cur_file = cur_file;
			fetch_blob('/art', {file: cur_file})
				.then(resp => (resp.status == 200) ? resp.blob() : null)
				.then(set_albumart);
		}
	} else {
		set_albumart(null);
	}

	const cur_song_info = document.getElementById('cur_song_info');
	cur_song_info.onclick = () => { show_info_panel(currentsong); };

	const cur_song_elapsed = document.getElementById('cur_song_elapsed');
	cur_song_elapsed.textContent = format_secs(status.elapsed);

	const cur_song_duration_el = document.getElementById('cur-song-duration');
	cur_song_duration_el.textContent = format_secs(status.duration);

	const cur_song_progess_el = document.getElementById('cur_song_progress');
	cur_song_progess_el.value = status.elapsed;
	cur_song_progess_el.max = currentsong.duration;

	if (status.state === 'play' && ! window.progress_timeout) {
		window.progress_timeout = function() {
			const new_progress = Number(cur_song_progess_el.value) + 0.1
			cur_song_progess_el.value = new_progress;
			cur_song_elapsed.textContent = format_secs(new_progress);

			wait(100).then(window.progress_timeout);
		};

		window.progress_timeout();
		navigator.mediaSession.playbackState = "playing";
		navigator.mediaSession.metadata = new MediaMetadata({
			title: currentsong.title,
			artist: currentsong.artist,
			album: currentsong.album,
		});
		navigator.mediaSession.setActionHandler('play', pause);
		navigator.mediaSession.setActionHandler('pause', pause);
	}

	if (status.state !== 'play') {
		window.progress_timeout = null;
	}

	const volume_slider = document.getElementById('volume_slider');
	const volume_down = document.getElementById('volume_down');
	const volume_up = document.getElementById('volume_up');
	if (!status.volume) {
		volume_slider.value = 0;
		volume_slider.disabled = true;
		volume_down.disabled = true;
		volume_up.disabled = true;
	} else {
		volume_slider.value = status.volume;
		volume_slider.disabled = false;
		volume_down.disabled = false;
		volume_up.disabled = false;
	}

	const volume_label = document.getElementById('volume_label');
	volume_label.textContent = status.volume;

	const pause_button = document.getElementById('pause_button');
	pause_button.textContent = status.state === 'play' ? pause_icon : play_icon;

	document.getElementById('repeat_value').checked = (status.repeat === '1');
	document.getElementById('random_value').checked = (status.random === '1');
	document.getElementById('single_value').checked = (status.single === '1');
	document.getElementById('consume_value').checked = (status.consume === '1');

	if (window.follow_mode) {
		locate_title(currentsong);
	}
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
		if (window.artist_mode === 'artist') {
			const link = document.createElement('a');
			link.textContent = song.artist || '';
			link.href = '#';
			link.addEventListener('click', () => locate_artist(song));
			el.appendChild(link);
			el.appendChild(document.createTextNode(' ('));
			el.appendChild(document.createTextNode(song.albumartist || ''));
			el.appendChild(document.createTextNode(')'));
		} else {
			el.appendChild(document.createTextNode(song.artist || ''));
			const link = document.createElement('a');
			link.textContent = song.albumartist || '';
			link.href = '#';
			link.addEventListener('click', () => locate_albumartist(song));
			el.appendChild(document.createTextNode(' ('));
			el.appendChild(link);
			el.appendChild(document.createTextNode(')'));
		}
	}
}

function populate_search_results(queue, table) {
	remove_children(table);

	const header_tr = document.createElement('tr');
	header_tr.innerHTML = '<th>' + ['Title', 'Album', 'Artist'].join('</th><th>') + '</th>';

	table.appendChild(header_tr);

	let current_song_tr = null;
	for (var i=0; i<queue.length; i++) {
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
	fetch_json('/outputs').then(outputs => {
		const div = document.createElement('div');
		for (output of outputs.sort((a,b) => a.outputid - b.outputid)) {
			const p = document.createElement('p');
			p.classList.add('outputs_modal');

			const enabled = document.createElement('input');
			enabled.type = 'checkbox';
			const input_id = output.outputname.replace(/[^a-zA-Z0-9]/g, "");
			enabled.id = input_id;
			enabled.checked = output.outputenabled === "1";
			enabled.addEventListener('change', () => {
				if (enabled.checked) {
					post_json('/enableoutput', {outputid: output.outputid})
						.then(() => notify(`Enabled output "${output.outputname}"`));
				} else {
					post_json('/disableoutput', {outputid: output.outputid})
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
				for (attr of output.attribute) {
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
	search_form.addEventListener('submit', e => {
		e.preventDefault();
		const query = e.target.elements.query.value;
		if (!query || query.length === 0){ return; }
		fetch_json('/search', {query: query})
			.then(results => show_search_results(results, query));
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
	populate_search_results(results.sort((a,b) => a.title > b.title), table);
	div.appendChild(table);

	display_modal(div);
}

// Music functions ////////////////////////////////////////////////////////////
function create_list_item(text, buttons) {
	const item_p = document.createElement('p');

	const item_span = document.createElement('span');
	item_span.textContent = text;

	const btn_span = document.createElement('span');
	btn_span.classList.add('btn_container');

	for (var i=0; i<buttons.length; i++) {
		const button_cb = buttons[i];
		const btn = document.createElement('button');

		switch (i) {
		case 0:
			btn.textContent = '+';
			btn.title = 'Add after current';
			break
		case 1:
			btn.textContent = '+|';
			btn.title = 'Add at end';
			break;
		case 2:
			btn.textContent = 'i';
			btn.title = 'Show information';
			break;
		}

		btn.classList.add('icon_button');
		btn.addEventListener('click', (event) => {
			event.stopPropagation();
			button_cb()
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

	for (var i=0; i<list.length; i++) {
		const info = list[i];

		const selected_info = opts.info_selector(info);

		const item = create_list_item(
			opts.item_text(info),
			[
				() => insert_to_queue(selected_info),
				() => append_to_queue(selected_info),
			]
		);
		if (opts.onclick) {
			item.addEventListener('click', (event) => {
				remove_class_add(list_div, item, 'selected');
				opts.onclick(info);
				set_follow_mode(false);
			});
		}
		list_div.appendChild(item);
	}
}

// Titles
function locate_title(song){
	if (!song) { return; }
	hide_modal();
	return set_display_mode('library').then(() => {
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

function get_titles(what, opts) {
	if (what.album === window.displayed.album) {
		if (opts && opts.highlight) {
			highlight({title: opts.highlight});
		}
		return;
	}

	return fetch_json('/titles', what)
		.then(populate_titles)
		.then(titles => {
			window.displayed = what;
			if (opts && opts.highlight) {
				highlight({title: opts.highlight});
			}
		});
}

function populate_titles(titles) {
	const list_div = document.getElementById('title-list');
	populate_list(titles, list_div, {
		header_title: 'Titles',
		display_ALL: false,
		item_text: info => info.title || info.name || info.file || 'No name',
		info_selector: info => info,
		onclick: info => fetch_json('/info', info).then(show_info_panel),
	});
	return;
}

// Albums
function locate_album(song){
	highlight({artist: song[window.artist_mode]});
	get_albums({[window.artist_mode]: song[window.artist_mode]}, {highlight: song.album});
	get_titles({[window.artist_mode]: song[window.artist_mode], album: song.album});
	hide_modal();
}

function clear_albums() {
	const albums_div = document.getElementById('album-list');
	remove_children(albums_div);
}

function get_playlists(opts) {
	return fetch_json('/playlists').then(playlists => {
		if (opts && opts.clear_titles) {
			clear_titles();
		}

		populate_albums(null, playlists);

		if (opts && opts.highlight) {
			highlight({album: opts.highlight});
		}
		return playlists;
	});
}

function get_albums(what, opts) {
	if (what[window.artist_mode] === window.displayed[window.artist_mode]) {
		if (opts && opts.highlight) {
			highlight({album: opts.highlight});
		}
		return;
	}

	return fetch_json('/albums', what).then(albums => {
		if (opts && opts.clear_titles) {
			clear_titles();
		}

		window.displayed = what;
		populate_albums(what[window.artist_mode], albums);

		if (opts && opts.highlight) {
			highlight({album: opts.highlight});
		}
		return albums;
	});
}

function populate_albums(artist, albums) {
	const album_or_playlist = window.display_mode === 'playlists' ? 'playlist' : 'album';
	const list_div = document.getElementById('album-list');
	populate_list(albums, list_div, {
		header_title: 'Albums',
		display_ALL: (window.display_mode !== 'playlists'),
		onclick_all: () => get_titles({[window.artist_mode]: artist}),
		item_text: (info) => info === '' ? '<empty string>' : info,
		info_selector: (info) => { return {[window.artist_mode]: artist, [album_or_playlist]: info}; },
		onclick: (info) => get_titles({[window.artist_mode]: artist, [album_or_playlist]: info}),
	});
}

// Artists
function locate_artist(song){
	highlight({artist: song.artist});
	get_albums({artist: song.artist});
	hide_modal();
}

function locate_albumartist(song){
	highlight({artist: song.albumartist});
	get_albums({albumartist: song.albumartist});
	hide_modal();
}

function clear_artists() {
	const artists_div = document.getElementById('artist-list');
	remove_children(artists_div);
}

function get_artists() {
	switch(window.artist_mode) {
		case 'artist':
			return fetch_json('/artists').then(populate_artists);
		case 'albumartist':
			return fetch_json('/albumartists').then(populate_artists);
	}
}

function populate_artists(artists) {
	const list_div = document.getElementById('artist-list');
	populate_list(artists, list_div, {
		header_title: 'Artists',
		display_ALL: true,
		onclick_all: () => get_albums({}),
		item_text: (info) => info === '' ? '<empty string>' : info,
		info_selector: (info) => { return {[window.artist_mode]: info}; },
		onclick: (info) => get_albums({[window.artist_mode]: info}, {clear_titles: true}),
	});
}

// Queue
function populate_queue(queue) {
	const queue_table = document.getElementById('queue');
	remove_children(queue_table);

	const header_tr = document.createElement('tr');
	header_tr.innerHTML = '<th>' + [
		queue.length, '', 'Title', 'Album', 'Artist', 'Length'
	].join('</th><th>') + '</th>'

	queue_table.appendChild(header_tr);

	let current_song_tr = null;
	for (var i=0; i<queue.length; i++) {
		const song = queue[i];
		const song_tr = document.createElement('tr');

		{ // Icons column
			const toggle_btn = document.createElement('button');
			toggle_btn.classList.add('icon_button');
			if (song.current === 'play') {
				toggle_btn.textContent = pause_icon;
				toggle_btn.addEventListener('click', pause);
			} else {
				toggle_btn.textContent = play_icon;
				toggle_btn.addEventListener('click', () => {
					post_json('/play', {id: song.pos}).then(refresh);
				});
			}

			const td = document.createElement('td');
			td.classList.add('btn_container');
			td.appendChild(toggle_btn);

			const info_btn = document.createElement('button');
			info_btn.classList.add('icon_button');
			info_btn.textContent = 'i';
			info_btn.addEventListener('click', () => show_info_panel(song));
			td.appendChild(info_btn);

			song_tr.appendChild(td);
		}

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
						command: () => remove_from_queue({ids: [song.pos]})
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
						command: () => remove_from_queue({album: song.album})
					},
				]);
			});
			song_tr.appendChild(td);
		}

		{ // Albumartist column
			const td = document.createElement('td');
			// TODO: context menu
			append_artist_links(song, td);
			/*
			const link = document.createElement('a');
			link.textContent = song.artist;
			link.href = '#';
			link.addEventListener('click', () => locate_albumartist(song));

			const td = document.createElement('td');
			td.appendChild(link);
			td.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				draw_context_menu(e.x, e.y, [
					{
						title: 'Remove artist',
						command: () => remove_from_queue({artist: song.artist})
					},
				]);
			});
			*/
			song_tr.appendChild(td);
		}

		{ // Length column
			const td = document.createElement('td');
			td.textContent = format_secs(song.duration);
			song_tr.appendChild(td);
		}

		if (song.current) {
			song_tr.classList.add('current');
			current_song_tr = song_tr;
		}

		queue_table.appendChild(song_tr);
	}

	if (window.follow_mode) {
		current_song_tr.scrollIntoView({behavior: 'smooth', block: 'center'});
	}
}

function update_queue() {
	return fetch_json('/queue').then(populate_queue);
}

function remove_from_queue(what) {
	post_json('/remove', what)
		.then(e => {
			notify('Removed', plural(e.removed, 'song', 'songs'));
			update_queue();
		});
}

function insert_to_queue(what) {
	post_json('/insert', what)
		.then(e => {
			notify('Inserted', plural(e.inserted, 'song', 'songs'));
			update_queue()
		});
}

function append_to_queue(what) {
	post_json('/append', what)
		.then(e => {
			notify('Appended', plural(e.appended, 'song', 'songs'));
			update_queue();
		});
}

// Action functions ///////////////////////////////////////////////////////////
function set_display_mode(mode) {
	if (mode == 'playlists') {
		document.getElementById('playlists_mode').checked = true;
	} else {
		document.getElementById('library_mode').checked = true;
	}

	if (window.display_mode === mode) {
		return Promise.resolve();
	}
	window.display_mode = mode;

	clear_titles();

	if (mode == 'playlists') {
		window.displayed = {};
		clear_artists();
		return get_playlists();
	} else {
		clear_albums();
		return get_artists();
	}
}

function toggle_theme() {
	body = document.documentElement.classList.toggle('alt-theme');
}

function set_artist_mode(mode) {
	if (window.artist_mode === mode) {
		return Promise.resolve();
	}
	window.artist_mode = mode;
	set_follow_mode(false);

	clear_albums();
	clear_titles();
	return get_artists();
}

function set_follow_mode(bool) {
	window.follow_mode = bool;

	const follow_mode_input = document.getElementById('follow_mode_input');
	follow_mode_input.checked = bool;

	if (bool) {
		locate_title(window.currentsong);
	}
}

function check_db_update(info) {
	const update_id = parseInt(info.status.updating_db) || -1;

	if (update_id >= 0) {
		window.update_in_progress = update_id;
	}

	if (!window.update_in_progress && update_id >= 0) {
		window.update_in_progress = update_id;
		notify(`DB update, ${update_id} started`);

	} else if (window.update_in_progress && !update_id) {
		notify(`DB update, ${window.update_in_progress}, complete`);
		window.update_in_progress = null;
	}
}

function refresh() {
	update_queue();
	return fetch_json('/status')
		.then(info => {
			populate_song_info(info);
			check_db_update(info);
			return info;
		});
}

function pause() {
	post_json('/pause').then(refresh);
}

function stop() {
	post_json('/stop').then(refresh);
}

function next() {
	post_json('/next').then(refresh);
}

function prev() {
	post_json('/prev').then(refresh);
}

function set_albumart(blob) {
	const img = document.getElementById('albumart');
	if (blob) {
		const objurl = URL.createObjectURL(blob);
		img.src = objurl;
	} else {
		img.src = '';
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
	post_json('/' + mode, {enabled: value ? '1' : '0'})
		.then(() => notify(msg));
}

function clear_playlist() {
	post_json('/clear').then(resp => {
		notify(`Removed ${resp.removed} songs`);
		update_queue();
	});
}

function clear_playlist_before_current() {
	const cur_pos = parseInt(window.currentsong.pos);
	post_json('/delete', {from: 0, to: cur_pos}).then(resp => {
		notify(`Removed ${resp.removed} songs`);
		update_queue();
	});
}

function shuffle_playlist() {
	post_json('/shuffle').then(update_queue);
}

function connect(hostname, port) {
	return post_json('/connect', {hostname: hostname, port: port})
		.then(result => {
			console.log(result);
			document.getElementById('hostname_input').value = result.hostname;
			document.getElementById('port_input').value = result.port;
			localStorage.setItem('hostname', result.hostname);
			localStorage.setItem('port', result.port);
			notify(`Connected to ${result.hostname}:${result.port}`);
		});
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

function setup() {
	// Only called on page init

	window.addEventListener('keyup', hide_modal);
	modal_background.addEventListener('click', hide_modal);

	const stored_hostname = localStorage.getItem('hostname');
	const stored_port = localStorage.getItem('port');
	if (stored_hostname) {
		connect(stored_hostname, stored_port);
	}

	document.getElementById('connection_form').addEventListener('submit', e => {
		e.preventDefault();
		const hostname = e.target.elements.hostname.value;
		const port = e.target.elements.port.value;
		connect(hostname, port).then(() => set_display_mode('library'));
		refresh();
	});

	// Album art view
	const albumart = document.getElementById('albumart');
	albumart.addEventListener('click', () => {
		const clone = albumart.cloneNode();
		display_modal(clone);
	});

	// Progress meter and label
	const progress_el = document.getElementById('cur_song_progress');
	progress_el.addEventListener('change', event => {
		post_json('/seek', {time: event.target.value});
	});

	const elapsed_el = document.getElementById('cur_song_elapsed');
	progress_el.addEventListener('input', event => {
		elapsed_el.textContent = format_secs(event.target.value);
	});

	// Volume Slider and label
	const volume_slider = document.getElementById('volume_slider');
	volume_slider.addEventListener('change', event => {
		post_json('/volume', {setvol: event.target.value});
	});

	const volume_label = document.getElementById('volume_label');
	volume_slider.addEventListener('input', event => {
		volume_label.textContent = event.target.value;
	});

	document.getElementById('volume_down').addEventListener('click', event => {
		const change = event.shiftKey ? -5 : -1;
		post_json('/volume', {volume: change})
			.then(result => {
				volume_slider.value = result.volume;
				volume_label.textContent = result.volume;
			});
	});

	document.getElementById('volume_up').addEventListener('click', event => {
		const change = event.shiftKey ? +5 : +1;
		post_json('/volume', {volume: change})
			.then(result => {
				volume_slider.value = result.volume;
				volume_label.textContent = result.volume;
			});
	});

	// Search form
	const search_form = document.getElementById('search_form');
	search_form.addEventListener('submit', e => {
		e.preventDefault();
		const query = e.target.elements.query.value;
		if (!query || query.length === 0){ return; }
		fetch_json('/search', {query: query})
			.then(results => show_search_results(results, query));
	});

	set_artist_mode('albumartist');
	set_auto_update(document.getElementById('auto_update_input').checked);
	set_follow_mode(document.getElementById('follow_mode_input').checked);
}

window.displayed = {};
window.display_mode = 'library';
window.onload = function(e) {
	setup();
	refresh();
}

window.addEventListener('click', hide_context_menu);
window.addEventListener('keyup', e => {
	if (e.target.tagName === 'INPUT' && e.target.type === 'text') { return; }
	if (e.key !== ' ' && e.key !== 'p') { return; }
	pause();
});

navigator.mediaSession.setActionHandler('play', pause);
navigator.mediaSession.setActionHandler('pause', pause);
