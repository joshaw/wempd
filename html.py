import json
import os
import random
import re
import time
from urllib.parse import quote_plus, unquote_plus, urlencode


BASE_MUSIC_URL = os.getenv("WEMPD_BASE_MUSIC_URL", "/")

icon_tick = "✓"
icon_cross = "✗"


def esc(s):
    s = s.replace("&", "&amp;")
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    s = s.replace('"', "&quot;")
    s = s.replace("'", "&#x27;")
    return s


def tag_factory(name, void=False):
    def __tag(*children, **attrs):
        if len(children) == 1 and isinstance(children[0], list):
            children = children[0]
        attrs = " ".join(f'{k}="{v}"' for k, v in attrs.items())
        if void:
            assert len(children) == 0
            return f"<{name} {attrs}>"
        return f"<{name} {attrs}>{''.join(children)}</{name}>"

    __tag.__name__ = name
    __tag.__qualname__ = f"tag_factory.{name}"
    return __tag


for tag, isvoid in {
    "a": False,
    "code": False,
    "div": False,
    "em": False,
    "form": False,
    "h2": False,
    "input_": True,
    "li": False,
    "ol": False,
    "p": False,
    "strong": False,
    "table": False,
    "td": False,
    "tr": False,
    "ul": False,
}.items():
    globals()[tag] = tag_factory(tag.removesuffix("_"), isvoid)


def html_link(text, href, root=False, folder=True):
    if isinstance(href, str):
        href = (href,)
    if href[0].startswith(("http://", "https://")):
        href = "/".join(h.replace("'", "%27") for h in href)
    else:
        href = "/".join((quote_plus(h) for h in href))
        href = f"{'/' if root else './'}{href}{'/' if folder else ''}"
    return a(esc(text), href=esc(href))


def html_form_link(href, data, text):
    return form(
        input_(type="submit", value=esc(text)),
        *[
            input_(type="hidden", name=esc(k), value=esc(json.dumps(v)))
            for k, v in data.items()
        ],
        method="post",
        action=f"{esc(href)}",
    )


def get_header(client, path):
    def link(text, link_path, name, folder=True):
        return (
            text
            if path == link_path
            else html_link(text, ("mpd", name), root=True, folder=folder)
        )

    status = client.status()
    play_state = "Pause" if status["state"] == "play" else "Play"

    return [
        """<!DOCTYPE html>
        <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <meta name="color-scheme" content="dark light" />
        <link rel="icon" type="image/png" sizes="32x32" href="/mpd/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="96x96" href="/mpd/favicon-96x96.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/mpd/favicon-16x16.png">
        """,
        '<link rel="manifest" href="manifest.json" />' if path == "/status" else "",
        """
        <style>
        body {
            max-width: 800px;
            margin: 10px auto;
            padding: 10px;
            word-break: break-word;
            font-family: sans-serif;
        }
        div { line-height: 2em; }
        li { line-height: 1.2; }
        form { display: inline-block; }
        table td:first-child {
            font-weight: bold;
            white-space: nowrap;
        }
        a { text-decoration: none; }
        a:hover { text-decoration: underline; }
        a[href^="http://"]::after, a[href^="https://"]::after {
            content: '↗';
            font-size: 65%;
            vertical-align: text-top;
        }
        #current {
            font-weight: bold;
            background: Field;
        }
        </style>
        <script>
        document.addEventListener("DOMContentLoaded", () => {
            Array.from(document.getElementsByTagName("form"))
            .filter(f => f.method === "post")
            .map(f => f.addEventListener("submit", (event) => {
                event.preventDefault();
                fetch(event.target.action, {
                    method: event.target.method,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams(new FormData(f)),
                })
                .then(() => window.location.reload(true));
            }));
        });
        </script>
        </head>
        <body>
        """,
        div(
            html_form_link("/mpd/api/pause", {}, play_state),
            " " + html_form_link("/mpd/api/previous", {}, "Prev"),
            " " + html_form_link("/mpd/api/next", {}, "Next"),
            "&nbsp;Vol: ",
            " " + status.get("volume", "unknown"),
            " " + html_form_link("/mpd/api/volume", {"volume": -5}, "-5"),
            " " + html_form_link("/mpd/api/volume", {"volume": -1}, "-1"),
            " " + html_form_link("/mpd/api/volume", {"volume": 1}, "+1"),
            " " + html_form_link("/mpd/api/volume", {"volume": 5}, "+5"),
        ),
        div(
            link("Status", "/status", "status", folder=False),
            " | " + link("Queue", "/queue/", "queue"),
            " | " + link("AlbumArtists", "/albumartists/", "albumartists"),
            " | " + link("Albums", "/albums/", "albums"),
            " | " + link("Playlists", "/playlists/", "playlists"),
        ),
    ]


def create_page(header, data, thelist):
    if not isinstance(header, str):
        header = " / ".join(header)
    if not isinstance(thelist, list):
        thelist = [thelist]
    return [
        h2(header),
        p(
            html_form_link("/mpd/api/insert", data, "Add after current"),
            " ",
            html_form_link("/mpd/api/append", data, "Append to queue"),
        )
        if data
        else "",
        *thelist,
    ]


def get_title(s):
    title = s.get("title")
    if not title or len(title) <= 1:
        title = s.get("name")
    if not title or len(title) <= 1:
        title = s["file"]
    return title


def get_artist(s):
    return s.get("albumartist", s.get("artist", ""))


def li_title(s):
    return li(
        html_link(get_title(s), s["file"], folder=False), value=s.get("track", "")
    )


def li_artist_title(s):
    return li(
        f"{s['artist']} - ",
        html_link(get_title(s), s["file"], folder=False),
        value=s.get("track", ""),
    )


def li_album_artist_title(s):
    return li(
        f"{s['artist']} - {s['album']} - "
        + html_link(get_title(s), ("mpd", "file", s["file"]), root=True, folder=False)
    )


def get_refresh(status):
    if status["state"] == "play" and float(status.get("duration", "0")) > 0:
        remaining = float(status["duration"]) - float(status["elapsed"])
        return {"refresh": int(remaining + 1)}
    return {}


def song_info_table(song_info, minimal=False):
    info_entries = []

    common_tags = {
        "track": "Track",
        "title": "Title",
        "album": "Album",
        "artist": "Artist",
        "albumartist": "Album Artist",
        "genre": "Genre",
        "originaldate": "Original Date",
        "label": "Label",
        "duration": "Duration",
        "file": "File",
    }
    mb_tags = {
        "musicbrainz_albumartistid": ("artist", "AlbumArtist"),
        "musicbrainz_albumid": ("album", "Album"),
        "musicbrainz_artistid": ("artist", "Artist"),
        "musicbrainz_releasetrackid": ("track", "Track"),
        "musicbrainz_trackid": ("recording", "Recording"),
        "musicbrainz_workid": ("work", "Work"),
    }
    hidden_tags = ("artistsort", "albumartistsort", "id")
    all_tags = song_info.keys()
    other_tags = (
        set(all_tags) - set(common_tags.keys()) - set(hidden_tags) - set(mb_tags.keys())
    )

    ordered_tags = [
        (a, common_tags[a]) for a in common_tags.keys() if a in all_tags
    ] + ([] if minimal else sorted(zip(list(other_tags), list(other_tags))))

    is_local = True
    for key, key_display in ordered_tags:
        value = song_info[key]
        href = None
        if key == "artist":
            href = ("mpd", "artists", value)
        elif key == "albumartist":
            href = ("mpd", "albumartists", value)
        elif key == "album":
            href = ("mpd", "albums", value)
        elif key == "title":
            value = html_link(
                value,
                (
                    "mpd",
                    "albumartists",
                    song_info["albumartist"],
                    song_info["album"],
                    song_info["file"],
                ),
                root=True,
                folder=False,
            )
        elif key == "genre":
            value = " / ".join(
                [
                    html_link(g.strip(), ("mpd", "genres", g.strip()), root=True)
                    for g in value.replace(";", "/").split("/")
                ]
            )
        elif key == "file":
            if value.startswith(("http://", "https://")):
                is_local = False
                href = value
            else:
                value = html_link(
                    value, ("mpd", "file", value), root=True, folder=False
                )
        elif key == "originaldate":
            href = ("mpd", "dates", value[:4])
        elif key == "label":
            href = ("mpd", "labels", value)
        elif key == "duration":
            value = f"{fmt_time(float(value))} ({value})" if float(value) > 0 else None

        if href:
            value = html_link(value, href, root=True)

        if key is not None and value is not None:
            info_entries.append(tr(td(key_display), td(value)))

    thelist = [table(*info_entries)]

    mb_links = []
    for key, value in mb_tags.items():
        if key in song_info:
            href = f"https://musicbrainz.org/{value[0]}/{song_info[key]}"
            mb_links.append(
                tr(td(f"MB {value[1]}"), td(code(html_link(song_info[key], href))))
            )

    if not minimal and mb_links:
        thelist.append("<br>" + table(*mb_links))

    if not minimal and is_local:
        image_url = "/mpd/api/art?" + urlencode({"file": song_info["file"]})
        thelist.append(p(a("Album art", href=image_url)))
    return thelist


def fmt_duration(s):
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


def fmt_time(s):
    return f"{int(s / 60):02}:{int(s % 60):02}"


def fmt_date(ts):
    return time.strftime("%c", time.localtime(ts))


def url_status(*, client, path, query):
    status = client.status()

    def gen_mode_button(mode):
        enabled = status[mode] == "1"
        title = f"{mode.title()} mode"
        button = html_form_link(
            f"/mpd/api/{mode}",
            {"enabled": "0" if enabled else "1"},
            "disable" if enabled else "enable",
        )
        value = icon_tick if enabled else icon_cross
        return [tr(td(title), td(value), td(button))]

    vol_btns = [
        html_form_link("/mpd/api/volume", {"volume": c}, f"{c:+}") + " "
        for c in (-10, -5, -1, 1, 5, 10)
    ]
    return [
        h2("Current Song"),
        *song_info_table(client.currentsong(), minimal=True),
        h2("Status"),
        table(
            tr(td("State"), td(status["state"])),
            tr(
                td("Volume"),
                td(status.get("volume", "unknown")),
                td(*vol_btns),
            ),
            *gen_mode_button("repeat"),
            *gen_mode_button("random"),
            *gen_mode_button("single"),
            *gen_mode_button("consume"),
        ),
        p(
            strong("More views: "),
            " | ".join(
                [
                    html_link("Artists", ("mpd", "artists"), root=True),
                    html_link("Genres", ("mpd", "genres"), root=True),
                    html_link("Dates", ("mpd", "dates"), root=True),
                    html_link("Labels", ("mpd", "labels"), root=True),
                ]
            ),
        ),
        p(strong("Library: "), html_link("stats", "stats", folder=False)),
        p(
            strong(html_link("Outputs", "outputs"), ": "),
            " ".join(
                [
                    f"[{output['outputname']}]"
                    if output["outputenabled"] == "1"
                    else output["outputname"]
                    for output in client.outputs()
                ]
            ),
        ),
        form(
            input_(name="s", placeholder="Search term", minlength=3, required=""),
            " ",
            input_(type="submit", value="Search"),
            action="/mpd/search",
        ),
        "<br><br>",
        form(
            input_(name="entry", placeholder="Add to queue", required=""),
            " ",
            input_(type="submit", value="Add"),
            action="/mpd/api/add",
            method="post",
        ),
    ], get_refresh(status)


def url_stats(*, client, path, query):
    stats = client.stats()
    return [
        h2("Library"),
        table(
            tr(td("Up time"), td(fmt_duration(int(stats["uptime"])))),
            tr(td("Play time"), td(fmt_duration(int(stats["playtime"])))),
            tr(td("&nbsp;")),
            tr(td("# Artists"), td(f"{int(stats['artists']):,.0f}")),
            tr(td("# Albums"), td(f"{int(stats['albums']):,.0f}")),
            tr(td("# Songs"), td(f"{int(stats['songs']):,.0f}")),
            tr(td("&nbsp;")),
            tr(td("DB Play time"), td(fmt_duration(int(stats["db_playtime"])))),
            tr(td("DB updated"), td(fmt_date(int(stats["db_update"])))),
        ),
    ]


def url_outputs(*, client, path, query):
    def toggle(output):
        enabled = output["outputenabled"] == "1"
        return html_form_link(
            f"/mpd/api/{'disableoutput' if enabled else 'enableoutput'}",
            {"outputid": output["outputid"]},
            "disable" if enabled else "enable",
        )

    return [
        h2("Outputs"),
        table(
            *[
                tr(
                    td(o["outputname"]),
                    td(o["plugin"]),
                    td(icon_tick if o["outputenabled"] == "1" else icon_cross),
                    td(toggle(o)),
                )
                for o in client.outputs()
            ]
        ),
    ]


def url_current(*, client, path, query):
    return [h2("Current Song"), *song_info_table(client.currentsong())], get_refresh(
        client.status()
    )


def url_queue(*, client, path, query):
    queue = client.playlistinfo()
    status = client.status()
    if "song" in status:
        queue[int(status["song"])]["current"] = status["state"]

    items = []
    for index, song in enumerate(queue):
        artist = get_artist(song)
        title = get_title(song)
        play_link = html_form_link("/mpd/api/play", {"id": song["pos"]}, "Play")
        items.append(
            tr(
                td(str(index)),
                td("" if "current" in song else play_link),
                td(
                    html_link(title, str(index), folder=False),
                    f"<br/>{artist} - {song.get('album', '')}",
                ),
                id="current" if "current" in song else "",
            )
        )

    return [
        h2(f"Queue ({len(queue)})"),
        html_form_link("/mpd/api/clear", {}, "Clear queue"),
        table(*items),
    ], get_refresh(status)


def url_queue_item(item, *, client, path, query):
    try:
        song_info = client.playlistinfo(int(item))[0]
    except:
        return [], {"location": "/mpd/queue/", "code": 301}

    header = " / ".join([html_link("Queue", "."), item])
    return [
        h2(header),
        p(
            html_form_link("/mpd/api/play", {"id": item}, "Play now"),
            " ",
            html_form_link("/mpd/api/remove", {"ids": [item]}, "Remove from queue"),
        ),
        *song_info_table(song_info),
    ], get_refresh(client.status())


def url_search(*, client, path, query):
    query = query.get("s")

    thelist = []
    if query and len(query) >= 3:
        for song in client.search("any", query):
            href = ("artists", song["artist"], song["album"], song["file"])
            thelist.append(
                li(
                    esc(f"{song['artist']} - {song['album']} - "),
                    html_link(song["title"], href, folder=False),
                )
            )
    return create_page("Search Results", None, ul(thelist))


def url_playlists(*, client, path, query):
    playlists = [p["playlist"] for p in client.listplaylists()]
    return create_page(
        "Playlists",
        None,
        ul([li(html_link(a, a)) for a in playlists]),
    )


def url_playlists_playlist(playlist_name, *, client, path, query):
    header = [html_link("Playlists", ".."), playlist_name]
    thelist = []
    for song in client.listplaylistinfo(playlist_name):
        artist = get_artist(song)
        name = get_title(song)
        link = html_link(name, song["file"], folder=False)
        if artist:
            thelist.append(li(f"{artist} - {link}"))
        else:
            thelist.append(li(link))
    return create_page(header, {"playlist": playlist_name}, ul(thelist))


def url_playlists_playlist_track(playlist, file, *, client, path, query):
    song_info = client.find("file", file)[0]
    return create_page(
        [html_link("Playlists", ".."), html_link(playlist, "."), song_info["title"]],
        {"file": file},
        song_info_table(song_info),
    )


def url_artists(style, *, client, path, query):
    artist_type = f"{style}artist"
    return create_page(
        artist_type.title(),
        None,
        ul(
            li(em(html_link("Random", "_random"))),
            *[
                li(html_link(a[artist_type], a[artist_type]))
                for a in client.list(artist_type)
            ],
        ),
    )


def url_artists_artist(style, artist, *, client, path, query):
    artist_type = f"{style}artist"
    is_random = artist == "_random"
    if is_random:
        artist = random.choice(client.list(artist_type))[artist_type]

    albums = client.list("album", artist_type, artist, "group", "originaldate")

    if len(albums) == 1 and not is_random:
        return [], {"location": f"./{albums[0]['album']}/", "code": 302}

    return create_page(
        [html_link(artist_type.title(), ".."), artist],
        {"find": [artist_type, artist]},
        ul(
            li(em(html_link("All", ("..", artist, "_all") if is_random else "_all"))),
            *[
                li(
                    html_link(
                        a["album"],
                        ("..", artist, a["album"]) if is_random else a["album"],
                    ),
                    f" ({a['originaldate'][:4]})" if a["originaldate"] else "",
                )
                for a in albums
            ],
        ),
    )


def url_artists_artist_all(style, artist, *, client, path, query):
    artist_type = f"{style}artist"
    header = [
        html_link(artist_type.title(), ("..", "..")),
        html_link(artist, ".."),
        "All tracks",
    ]
    data = (artist_type, artist)
    thelist = [
        li_artist_title(a) for a in sorted(client.find(*data), key=lambda x: x["title"])
    ]
    return create_page(header, {"find": data}, ul(thelist))


def url_artists_artist_album(style, artist, album, *, client, path, query):
    artist_type = f"{style}artist"
    all_tracks = album == "_all"
    header = [
        html_link(artist_type.title(), ("..", "..")),
        html_link(artist, ".."),
        album,
    ]

    data = (artist_type, artist, "album", None if all_tracks else album)
    songs = sorted(
        client.find(*data),
        key=lambda a: int(a["track"]) if a.get("track") else a["title"],
    )
    if len(set(a["artist"] for a in songs)) == 1:
        thelist = [li_title(a) for a in songs]
    else:
        thelist = [li_artist_title(a) for a in songs]
    return create_page(
        header, {"find": data}, ul(thelist) if all_tracks else ol(thelist)
    )


def url_artists_artist_album_track(style, artist, album, file, *, client, path, query):
    song_info = client.find("file", file)[0]
    return create_page(
        [
            html_link(f"{style}artist".title(), ("..", "..")),
            html_link(artist, ".."),
            html_link("All tracks" if album == "_all" else album, "."),
            song_info["title"],
        ],
        {"file": file},
        song_info_table(song_info),
    )


def url_albums(*, client, path, query):
    return create_page(
        "Albums",
        None,
        ul(
            li(em(html_link("Random", "_random"))),
            *[
                li(html_link(a["album"], a["album"]), " - ", a["albumartist"])
                for a in sorted(
                    client.list("album", "group", "albumartist"),
                    key=lambda x: x["album"],
                )
            ],
        ),
    )


def url_albums_album(album, *, client, path, query):
    is_random = album == "_random"
    if is_random:
        album = random.choice(client.list("album"))["album"]

    data = ("album", album)
    songs = client.find(*data)
    artists = set(a["artist"] for a in songs)
    if len(artists) == 1:
        album = f"{album} - {artists.pop()}"
        thelist = [li_title(a) for a in songs]
    else:
        thelist = [li_artist_title(a) for a in songs]
    return create_page([html_link("Albums", ".."), album], {"find": data}, ol(*thelist))


def url_albums_album_track(album, file, *, client, path, query):
    song_info = client.find("file", file)[0]
    return create_page(
        [html_link("Albums", ".."), html_link(album, "."), song_info["title"]],
        {"file": file},
        song_info_table(song_info),
    )


def url_genres(*, client, path, query):
    genres = set()
    for genre_list in client.list("genre"):
        for genre in genre_list["genre"].replace(";", "/").split("/"):
            genres.add(genre.strip())
    genres = sorted(list(genres))

    thelist = [li(html_link("None" if a == "" else a, a)) for a in genres]
    return create_page("Genres", None, ul(*thelist))


def url_genres_genre(genre, *, client, path, query):
    data = ("genre", "") if genre == "" else (f"(genre contains '{genre}')",)
    thelist = [li_album_artist_title(a) for a in client.find(*data)]
    return create_page([html_link("Genres", ".."), genre], {"find": data}, ul(*thelist))


def url_dates(*, client, path, query):
    dates = set(a["originaldate"][:4] for a in client.list("originaldate"))
    thelist = [
        li(html_link("None" if a == "" else a, a)) for a in reversed(sorted(dates))
    ]
    return create_page("Dates", None, ul(*thelist))


def url_dates_date(date, *, client, path, query):
    data = (
        ("originaldate", "") if date == "" else (f"(originaldate contains '{date}')",)
    )
    thelist = [li_album_artist_title(a) for a in client.find(*data)]
    return create_page([html_link("Dates", ".."), date], {"find": data}, ul(*thelist))


def url_labels(*, client, path, query):
    labels = [a["label"] for a in client.list("label")]
    thelist = [li(html_link("None" if a == "" else a, a)) for a in labels]
    return create_page("Labels", None, ul(*thelist))


def url_labels_label(label, *, client, path, query):
    data = ("label", label)
    thelist = [li_album_artist_title(a) for a in client.find(*data)]
    return create_page([html_link("Labels", ".."), label], {"find": data}, ul(*thelist))


def url_file(file, *, client, path, query):
    song_info = client.find("file", file)[0]
    header = ["file://" + file]
    link = ["File: ", html_link(file, (BASE_MUSIC_URL, file))]
    return create_page(header, {"file": file}, song_info_table(song_info)) + link


def url_add_trailing_slash(*parts, client, path, query):
    query = f"?{urlencode(query)}" if query else ""
    return [], {"location": f"/mpd{path}/{query}", "code": 301}


def url_remove_trailing_slash(*parts, client, path, query):
    query = f"?{urlencode(query)}" if query else ""
    return [], {"location": f"/mpd{path.removesuffix('/')}{query}", "code": 301}


matcher = {
    "/status": url_status,
    "/status/": url_remove_trailing_slash,
    "/stats": url_stats,
    "/stats/": url_remove_trailing_slash,
    "/current": url_current,
    "/current/": url_remove_trailing_slash,
    "/queue": url_add_trailing_slash,
    "/queue/": url_queue,
    "/queue/([0-9]+)": url_queue_item,
    "/outputs": url_add_trailing_slash,
    "/outputs/": url_outputs,
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
    "/(album|)artists/([^/]+)/_all/": url_artists_artist_all,
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
    "/file/([^/]+)": url_file,
}


def handle_get(client, path, query):
    for pattern, func in matcher.items():
        matches = re.fullmatch(pattern, path)
        if matches:
            resp = func(
                *(unquote_plus(g) for g in matches.groups()),
                client=client,
                path=unquote_plus(path),
                query=query,
            )
            if isinstance(resp, tuple):
                lines = resp[0]
                headers = resp[1]
            else:
                lines = resp
                headers = {}
            return get_header(client, path) + lines, headers

    return get_header(client, path) + [h2("Page not found"), p(path)], {"code": 404}
