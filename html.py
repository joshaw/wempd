import json
import random
import re
import time
from urllib.parse import quote_plus, unquote_plus, urlencode

import api


def html_link(text, href, root=False, folder=True):
    if isinstance(href, str):
        href = (href,)
    if href[0].startswith("http://") or href[0].startswith("https://"):
        href = href[0]
    else:
        href = "/".join((quote_plus(h) for h in href))
        href = f"{'/' if root else './'}{href}{'/' if folder else ''}"
    return f"<a href='{href}'>{text}</a>"


def html_form_link(href, data, text):
    data = json.dumps(data).replace('"', "&quot;")
    return "\n".join(
        [
            f'<form method="post" action="{href}">',
            f'<input type="hidden" name="data" value="{data}" />',
            f'<input type="submit" value="{text}" />',
            "</form>",
        ]
    )


def get_header(client):
    return [
        """<!DOCTYPE html>
        <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <style>
        body {
            max-width: 800px;
            margin: 10px auto;
            padding: 10px;
            word-break: break-word;
        }
        div { line-height: 2em; }
        form { display: inline-block; }
        table td:first-child {
            font-weight: bold;
            white-space: nowrap;
        }
        a[href^="http://"]::after, a[href^="https://"]::after {
            content: '↗';
            font-size: 65%;
            vertical-align: text-top;
        }
        #current {
            border-left: solid 1px;
            padding-left: 0.5em;
            font-weight: bold;
            background: #f0f0f0;
        }
        .hscroll {
            white-space: nowrap;
            overflow: scroll;
        }
        </style>
        <script>
        document.addEventListener("DOMContentLoaded", () => {
            Array.from(document.getElementsByTagName("form"))
            .filter(f => f.method === "post")
            .map(f => {
                f.addEventListener("submit", (event) => {
                    event.preventDefault();
                    fetch(event.target.action, {
                        method: event.target.method,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: new URLSearchParams(new FormData(f)),
                    })
                    .then(() => window.location.reload(true));
                });
            });
        });
        </script>
        </head>
        <body>
        """,
        "<div class='hscroll'>",
        " ".join(
            [
                html_form_link(
                    "/mpd/api/pause",
                    {},
                    "Pause" if client.status()["state"] == "play" else "Play",
                ),
                html_form_link("/mpd/api/previous", {}, "Prev"),
                html_form_link("/mpd/api/next", {}, "Next"),
                "<form action='/mpd/search'><input name='s'/> <input type='submit' value='Search' /></form>",
            ]
        ),
        "</div><div class='hscroll'>",
        " | ".join(
            [
                html_link("Status", ("mpd", "status"), root=True, folder=False),
                html_link("Queue", ("mpd", "queue"), root=True, folder=False),
                html_link("AlbumArtists", ("mpd", "albumartists"), root=True),
                html_link("Albums", ("mpd", "albums"), root=True),
                html_link("Playlists", ("mpd", "playlists"), root=True),
            ]
        ),
        "</div>",
    ]


def create_page(header, data, thelist):
    if not isinstance(header, str):
        header = " ╱ ".join(header)
    lines = [f"<h2>{header}</h2>"]
    if data:
        lines.extend(
            [
                "<p>",
                html_form_link("/mpd/api/insert", data, "Add after current"),
                html_form_link("/mpd/api/append", data, "Append to queue"),
                "</p>",
            ]
        )
    lines.extend(thelist)
    return lines


def create_list_page(header, data, thelist, style="ul"):
    assert style in ("ul", "ol")
    thelist.insert(0, f"<{style}>")
    thelist.append(f"</{style}>")
    return create_page(header, data, thelist)


def song_info_table(client, song_info):
    thelist = ["<table>"]
    links = []

    special_keys = {
        "title": "Title",
        "album": "Album",
        "artist": "Artist",
        "albumartist": "Album Artist",
        "genre": "Genre",
        "date": "Date",
        "label": "Label",
        "duration": "Duration",
        "track": "Track #",
        "file": "File",
    }
    all_keys = song_info.keys()
    other_keys = set(all_keys).difference(special_keys.keys())

    ordered_keys = [
        (a, special_keys[a]) for a in special_keys.keys() if a in all_keys
    ] + sorted(zip(list(other_keys), list(other_keys)))

    for key, key_display in ordered_keys:
        value = song_info[key]
        href = None
        if key == "artist":
            href = ("mpd", "artists", value)
        elif key == "albumartist":
            href = ("mpd", "albumartists", value)
        elif key == "album":
            href = ("mpd", "albums", value)
        elif key == "genre":
            href = ("mpd", "genres", value)
        elif key == "date":
            href = ("mpd", "dates", value)
        elif key == "label":
            href = ("mpd", "labels", value)
        elif key == "duration":
            value = f"{int(float(value)/60)}:{int(float(value)%60)} ({value})"
        elif key == "musicbrainz_albumartistid":
            key = None
            href = f"https://musicbrainz.org/artist/{value}"
            links.append(html_link("MB AlbumArtist ID", href, root=True))
        elif key == "musicbrainz_albumid":
            key = None
            href = f"https://musicbrainz.org/album/{value}"
            links.append(html_link("MB Album ID", href, root=True))
        elif key == "musicbrainz_artistid":
            key = None
            href = f"https://musicbrainz.org/artist/{value}"
            links.append(html_link("MB Artist ID", href, root=True))
        elif key == "musicbrainz_trackid":
            key = None
            href = f"https://musicbrainz.org/recording/{value}"
            links.append(html_link("MB Recording ID", href, root=True))
        elif key == "musicbrainz_releasetrackid":
            key = None
            href = f"https://musicbrainz.org/track/{value}"
            links.append(html_link("MB Track ID", href, root=True))

        if href:
            value = html_link(value, href, root=True)

        if key is not None and value is not None:
            thelist.append(f"<tr><td>{key_display}</td><td>{value}</td></tr>")

    thelist.append("</table>")

    thelist.append("<p>")
    for link in links:
        thelist.append(link)
        thelist.append("<br/>")
    thelist.append("</p>")

    image_url = "/mpd/api/art?" + urlencode({"file": song_info["file"]})
    thelist.append(f"<p><a href={image_url}>Album art</a></p>")
    return thelist


def create_song_page(client, header, data):
    song_info = client.find(*api.info_pairs(data))[0]
    header.append(song_info["title"])
    return create_page(header, data, song_info_table(client, song_info))


def fmt_secs(s):
    yrs = int(s / 31536000)
    s = s % 31536000
    days = int(s / 86400)
    s = s % 86400
    hrs = int(s / 3600)
    s = s % 3600
    mins = int(s / 60)
    secs = int(s % 60)
    return ", ".join(
        x
        for x in [
            f"{yrs} years" if yrs else "",
            f"{days} days" if days else "",
            f"{hrs} hours" if hrs else "",
            f"{mins} mins" if mins else "",
            f"{secs} secs" if secs else "",
        ]
        if x
    )


def fmt_date(ts):
    return time.strftime("%c", time.localtime(ts))


def url_status(client, path, query):
    status = client.status()

    def gen_mode_button(mode):
        enabled = status[mode] == "1"
        title = f"{mode.title()} mode"
        button = html_form_link(
            f"/mpd/api/{mode}",
            {"enabled": "0" if enabled else "1"},
            "disable" if enabled else "enable",
        )
        value = "✓" if enabled else "✗"
        return [f"<tr><td>{title}:</td><td>{value}</td><td>{button}</td></tr>"]

    stats = client.stats()

    volume = status.get("volume", "unknown")
    return [
        f"<h2>Status</h2>",
        "<table>",
        f"<tr><td>State:</td><td>{status['state']}</td></tr>",
        f"<tr><td>Volume:</td><td>{volume}</td><td>",
        *[
            html_form_link("/mpd/api/volume", {"volume": c}, f"{c:+}")
            for c in (-10, -5, -1, 1, 5, 10)
        ],
        "</td></tr>",
        *gen_mode_button("repeat"),
        *gen_mode_button("random"),
        *gen_mode_button("single"),
        *gen_mode_button("consume"),
        "</table>",
        "<h2>Library</h2>",
        "<table>",
        f"<tr><td>Up time:</td><td>{fmt_secs(int(stats['uptime']))}</td></tr>",
        f"<tr><td>Play time:</td><td>{fmt_secs(int(stats['playtime']))}</td></tr>",
        "<tr><td>&nbsp;</td></tr>",
        f"<tr><td># Artists:</td><td>{int(stats['artists']):,.0f}</td></tr>",
        f"<tr><td># Albums:</td><td>{int(stats['albums']):,.0f}</td></tr>",
        f"<tr><td># Songs:</td><td>{int(stats['songs']):,.0f}</td></tr>",
        "<tr><td>&nbsp;</td></tr>",
        f"<tr><td>DB Play time:</td><td>{fmt_secs(int(stats['db_playtime']))}</td></tr>",
        f"<tr><td>DB updated:</td><td>{fmt_date(int(stats['db_update']))}</td></tr>",
        "</table>",
        "<p><b>Modes:</b> ",
        " | ".join(
            [
                html_link("Artists", ("mpd", "artists"), root=True),
                html_link("Genres", ("mpd", "genres"), root=True),
                html_link("Dates", ("mpd", "dates"), root=True),
                html_link("Labels", ("mpd", "labels"), root=True),
            ]
        ),
        "</p>",
    ]


def url_queue(client, path, query):
    queue = api.list_queue(client)
    thelist = [
        f"<h2>Queue ({len(queue)})</h2>",
        html_form_link("/mpd/api/clear", {}, "Clear queue"),
        "<ol>",
    ]
    for index, song in enumerate(queue):
        artist = song.get("albumartist", song.get("artist", ""))
        album = song.get("album", "")
        title = song.get("title")

        if not title:
            title = song.get("name", song.get("file", "??"))

        song_link = html_link(title, str(index), folder=False)

        current = "current" in song

        play_now = ""
        if not current:
            play_now = html_form_link("/mpd/api/play", {"id": song["pos"]}, "Play now")

        thelist.append(
            f"<li value='{index}' {'id=current' if current else ''}>"
            + "<br/>".join(
                [
                    song_link + " " + play_now,
                    f"{artist} - {album}",
                ]
            )
            + "</li>"
        )
    thelist.append("</ol>")
    return thelist


def url_queue_item(client, path, query, item):
    song_info = client.playlistinfo(int(item))[0]
    header = " ╱ ".join([html_link("Queue", "."), item])
    return (
        [f"<h2>{header}</h2>"]
        + [
            "<p>",
            html_form_link("/mpd/api/play", {"id": item}, "Play now"),
            html_form_link("/mpd/api/remove", {"ids": [item]}, "Remove from queue"),
            "</p>",
        ]
        + song_info_table(client, song_info)
    )


def url_search(client, path, query):
    query = query.get("s")

    thelist = []
    if query and len(query) >= 3:
        for song in client.search("any", query):
            href = ("artists", song["artist"], song["album"], song["file"])
            thelist.append(
                "<li>"
                + f"{song['artist']} - {song['album']} - "
                + html_link(song["title"], href, folder=False)
                + "</li>"
            )
    return create_list_page("Search Results", None, thelist)


def url_playlists(client, path, query):
    return create_list_page(
        "Playlists",
        None,
        [
            "<ul>",
            *["<li>" + html_link(a, a) + "</li>" for a in api.list_playlists(client)],
            "</ul>",
        ],
    )


def url_playlists_playlist(client, path, query, playlist_name):
    header = [html_link("Playlists", ".."), playlist_name]
    data = {"playlist": playlist_name}
    thelist = []
    for song in api.list_titles(client, {"playlist": playlist_name}):
        name = song.get("title")
        if not name:
            name = song.get("name")
        if not name:
            name = song.get("file")
        link = html_link(name, song["file"], folder=False)
        thelist.append(f"<li>{link}</li>")
    return create_list_page(header, data, thelist)


def url_playlists_playlist_track(client, path, query, playlist, file):
    return create_song_page(
        client,
        [html_link("Playlists", ".."), html_link(playlist, ".")],
        {"file": file},
    )


def url_artists(client, path, query, style):
    artist_type = f"{style}artist"
    list_func = api.list_albumartists if style == "album" else api.list_artists
    random_link = html_link("<span title='random'>↝</span>", "_random")
    return create_list_page(
        artist_type.title() + " " + random_link,
        None,
        ["<li>" + html_link(a, a) + "</li>" for a in list_func(client)],
    )


def url_artists_artist(client, path, query, style, artist):
    artist_type = f"{style}artist"
    is_random = False
    if artist == "_random":
        is_random = True
        artist = random.choice(client.list(artist_type))[artist_type]

    return create_list_page(
        [html_link(artist_type.title(), ".."), artist],
        {"artist": artist},
        [
            "<li>"
            + html_link("All", ("..", artist, "_all") if is_random else "_all")
            + "</li>",
            *[
                "<li>" + html_link(a, ("..", artist, a) if is_random else a) + "</li>"
                for a in api.list_albums(client, {artist_type: artist})
            ],
        ],
    )


def url_artists_artist_album(client, path, query, style, artist, album):
    artist_type = f"{style}artist"
    all_tracks = album == "_all"
    header = [
        html_link(artist_type.title(), ("..", "..")),
        html_link(artist, ".."),
        "All tracks" if all_tracks else album,
    ]
    data = {
        artist_type: artist,
        "album": None if all_tracks else album,
    }

    thelist = []
    sort_func = lambda a: a["title"] if all_tracks else int(a["track"])
    for a in sorted(api.list_titles(client, data), key=sort_func):
        value = a["track"]
        link = html_link(a["title"], a["file"], folder=False)
        thelist.append(f"<li value='{value}'>{link}</li>")

    return create_list_page(header, data, thelist, style="ul" if all_tracks else "ol")


def url_artists_artist_album_track(client, path, query, style, artist, album, file):
    return create_song_page(
        client,
        [
            html_link(f"{style}artist".title(), ("..", "..")),
            html_link(artist, ".."),
            html_link("All tracks" if album == "_all" else album, "."),
        ],
        {"file": file},
    )


def url_albums(client, path, query):
    return create_list_page(
        "Albums " + html_link("<span title='random'>↝</span>", "_random"),
        {},
        [
            "<li>" + html_link("Random", "_random") + "</li>",
            *["<li>" + html_link(a, a) + "</li>" for a in api.list_albums(client, {})],
        ],
    )


def url_albums_album(client, path, query, album):
    if album == "_random":
        album = random.choice(client.list("album"))["album"]

    data = {"album": album}
    return create_list_page(
        [html_link("Albums", ".."), album],
        data,
        [
            f"<li value='{a['track']}'>"
            + html_link(a["title"], a["file"], folder=False)
            + "</li>"
            for a in api.list_titles(client, data)
        ],
        style="ol",
    )


def url_albums_album_track(client, path, query, album, file):
    return create_song_page(
        client,
        [html_link("Albums", ".."), html_link(album, ".")],
        {"file": file},
    )


def url_genres(client, path, query):
    genres = [a["genre"].split("/") for a in client.list("genre")]
    genres = set(genre for genre_list in genres for genre in genre_list)
    genres = sorted([g.strip() for g in genres])
    return create_list_page(
        "Genres",
        None,
        ["<li>" + html_link("None" if a == "" else a, a) + "</li>" for a in genres],
    )


def url_genres_genre(client, path, query, genre):
    query = ("genre", "") if genre == "" else (f"(genre contains '{genre}')",)
    return create_list_page(
        [html_link("Genres", ".."), genre],
        {"genre": genre},
        [
            f"<li>{a['artist']} - {a['album']} - "
            + html_link(
                a["title"],
                ("mpd", "artists", a["artist"], a["album"], a["file"]),
                root=True,
                folder=False,
            )
            + "</li>"
            for a in client.find(*query)
        ],
    )


def url_dates(client, path, query):
    return create_list_page(
        "Dates",
        None,
        [
            "<li>" + html_link("None" if a == "" else a, a) + "</li>"
            for a in [a["originaldate"] for a in client.list("originaldate")]
        ],
    )


def url_dates_date(client, path, query, date):
    return create_list_page(
        [html_link("Dates", ".."), date],
        {"originaldate": date},
        [
            f"<li>{a['artist']} - {a['album']} - "
            + html_link(
                a["title"],
                ("mpd", "artists", a["artist"], a["album"], a["title"]),
                root=True,
                folder=False,
            )
            + "</li>"
            for a in api.list_titles(client, data)
        ],
    )


def url_labels(client, path, query):
    labels = [a["label"] for a in client.list("label")]
    return create_list_page(
        "Labels",
        None,
        ["<li>" + html_link("None" if a == "" else a, a) + "</li>" for a in labels],
    )


def url_labels_label(client, path, query, label):
    header = [html_link("Labels", ".."), label]
    data = {"label": label}
    thelist = [
        f"<li>{a['artist']} - {a['album']} - "
        + html_link(
            a["title"],
            ("mpd", "artists", a["artist"], a["album"], a["title"]),
            root=True,
            folder=False,
        )
        + "</li>"
        for a in api.list_titles(client, data)
    ]
    return create_list_page(header, data, thelist)


def url_redirect(new_path):
    return lambda client, path, query: (new_path, 301)


def url_add_trailing_slash(client, path, query, *parts):
    query = urlencode(query)
    if query:
        query = f"?{query}"
    return (f"/mpd{path}/{query}", 301)


def url_remove_trailing_slash(client, path, query, *parts):
    query = urlencode(query)
    if query:
        query = f"?{query}"
    return (f"/mpd{path.removesuffix('/')}{query}", 301)


matcher = {
    "/status": url_status,
    "/queue": url_add_trailing_slash,
    "/queue/": url_queue,
    "/queue/([0-9]+)": url_queue_item,
    "/search": url_search,
    "/search/": url_remove_trailing_slash,
    "/playlists": url_add_trailing_slash,
    "/playlists/": url_playlists,
    "/playlists/([^/]+)": url_add_trailing_slash,
    "/playlists/([^/]+)/": url_playlists_playlist,
    "/playlists/([^/]+)/([^/]+)": url_playlists_playlist_track,
    "/(album|)artists": url_add_trailing_slash,
    "/(album|)artists/": url_artists,
    "/(album|)artists/([^/]+)": url_add_trailing_slash,
    "/(album|)artists/([^/]+)/": url_artists_artist,
    "/(album|)artists/([^/]+)/([^/]+)": url_add_trailing_slash,
    "/(album|)artists/([^/]+)/([^/]+)/": url_artists_artist_album,
    "/(album|)artists/([^/]+)/([^/]+)/([^/]+)": url_artists_artist_album_track,
    "/albums": url_add_trailing_slash,
    "/albums/": url_albums,
    "/albums/([^/]+)": url_add_trailing_slash,
    "/albums/([^/]+)/": url_albums_album,
    "/albums/([^/]+)/([^/]+)": url_albums_album_track,
    "/genres": url_add_trailing_slash,
    "/genres/": url_genres,
    "/genres/([^/]*)": url_add_trailing_slash,
    "/genres/([^/]*)/": url_genres_genre,
    "/dates": url_add_trailing_slash,
    "/dates/": url_dates,
    "/dates/([^/]*)/": url_dates_date,
    "/labels": url_add_trailing_slash,
    "/labels/": url_labels,
    "/labels/([^/]*)/": url_labels_label,
}


def handle_get(client, path, query):
    page = None
    for pattern, func in matcher.items():
        matches = re.fullmatch(pattern, path)
        if matches:
            return func(
                client,
                unquote_plus(path),
                query,
                *(unquote_plus(g) for g in matches.groups()),
            )

    return ["<h2>Page not found</h2>", f"<p>{path}</p>"]
