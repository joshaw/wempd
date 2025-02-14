import http.server
import json
import logging
import mpd
import os
import urllib.parse

from api import (
    get_status,
    info_pairs,
    init_client,
    insert,
    list_albumartists,
    list_albums,
    list_artists,
    list_playlists,
    list_queue,
    list_titles,
    remove_from_queue_by_id,
    remove_from_queue_by_search,
    remove_path_prefix,
    simplify_title_list,
)

import html

logging.basicConfig(level=logging.INFO)


class MPDRequestHandler(http.server.BaseHTTPRequestHandler):
    client = init_client(None)

    def log_message(self, fmt, *msg):
        logging.debug(fmt, *msg)

    def return_json(self, data, code=200):
        self.send_headers(content_type="application/json", code=code)
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def return_json_fail(self, msg):
        print(f"Error: {msg}")
        self.return_json({"error": msg}, code=400)

    def handle_html_get(self, path, query):
        resp, headers = html.handle_get(self.client, path, query)
        self.send_headers(**headers)
        self.wfile.write("\n".join(resp).encode("utf-8"))

    def send_headers(
        self,
        cache_control="no-store",
        code=200,
        content_length=None,
        content_type="text/html",
        location=None,
        refresh=None,
    ):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", cache_control)
        if location is not None:
            self.send_header("Location", location)
        if content_length is not None:
            self.send_header("Content-Length", content_length)
        if refresh is not None:
            self.send_header("Refresh", refresh)
        self.end_headers()

    def handle_get_api(self, path, query):
        path = path.removeprefix("/api")
        if path == "/albumartists":
            self.return_json(list_albumartists(self.client))

        elif path == "/albums":
            self.return_json(list_albums(self.client, query))

        elif path == "/art":
            if "file" not in query:
                self.return_json_fail("Missing 'file' parameter")
                return

            try:
                if self.client.mpd_version >= "0.22.0":
                    pic = self.client.readpicture(query["file"])
                else:
                    pic = self.client.albumart(query["file"])

                binary = pic["binary"]
                self.send_headers(
                    content_type=pic.get("type", "image/jpg"),
                    content_length=len(binary),
                    cache_control="max-age=31536000, immutable",
                    code=200,
                )
                self.wfile.write(binary)
            except (KeyError, mpd.base.CommandError):
                self.return_json({"Error": "No file exists"}, code=204)

        elif path == "/artists":
            self.return_json(list_artists(self.client))

        elif path == "/count":
            try:
                self.return_json(self.client.count(*info_pairs(query)))
            except mpd.base.CommandError as e:
                self.return_json_fail(str(e))

        elif path == "/info":
            if "pos" in query:
                self.return_json(self.client.playlistinfo(query["pos"])[0])
                return

            song_info = self.client.find(*info_pairs(query))
            if song_info:
                song_info = song_info[0]
                self.return_json(song_info)
            else:
                self.return_json_fail("Could not find details")

        elif path == "/outputs":
            self.return_json(self.client.outputs())

        elif path == "/search":
            try:
                lst = self.client.search("any", query["query"])
                self.return_json(simplify_title_list(lst))
            except KeyError:
                self.return_json_fail("Missing parameter, 'query'")

        elif path == "/playlists":
            self.return_json(list_playlists(self.client))

        elif path == "/queue":
            self.return_json(list_queue(self.client))

        elif path == "/stats":
            stats = self.client.stats()
            stats["mpd_version"] = self.client.mpd_version
            stats["updating_db"] = self.client.status().get("updating_db")
            self.return_json(stats)

        elif path == "/status":
            self.return_json(get_status(self.client))

        elif path == "/titles":
            self.return_json(list_titles(self.client, query))

    def do_GET(self):
        MPDRequestHandler.client = init_client(self.client)

        path_explode = urllib.parse.urlparse(self.path)
        orig_path = path_explode.path
        path = remove_path_prefix(orig_path)
        query = urllib.parse.parse_qs(path_explode.query, keep_blank_values=True)
        query = {k: v[-1] for k, v in query.items()}

        # Files
        if path == "/":
            with open("index.html", "r") as f:
                self.send_headers()
                self.wfile.write(f.read().encode("utf-8"))
                return

        if path == "/favicon.ico":
            self.send_response(200)
            self.end_headers()
            return

        if path == "/manifest.json":
            with open("manifest.json", "rb") as f:
                self.send_headers(content_type="application/manifest+json")
                self.wfile.write(f.read())
                return

        if path.removeprefix("/") in [
            "favicon-16x16.png",
            "favicon-32x32.png",
            "favicon-96x96.png",
        ]:
            with open(path.removeprefix("/"), "rb") as f:
                self.send_headers(content_type="image/png")
                self.wfile.write(f.read())
                return

        if path == "/script.js":
            with open("script.js", "r") as f:
                self.send_headers(content_type="application/javascript")
                self.wfile.write(f.read().encode("utf-8"))
                return

        # API
        if path.startswith("/api/"):
            self.handle_get_api(path, query)
        else:
            self.handle_html_get(path, query)

    def do_POST(self):
        MPDRequestHandler.client = init_client(self.client)

        path_explode = urllib.parse.urlparse(self.path)
        path = remove_path_prefix(path_explode.path)

        length = int(self.headers["Content-Length"])

        post_data = self.rfile.read(length).decode("utf-8") or "{}"
        if self.headers["Content-Type"] == "application/x-www-form-urlencoded":
            post_data = urllib.parse.parse_qs(post_data)
            post_data = post_data["data"][0]

        post_data = json.loads(post_data)

        if path.startswith("/api/"):
            path = path.removeprefix("/api")
            if path == "/add":
                try:
                    entry = post_data["entry"]
                    self.client.add(entry)
                    self.return_json({"added": 1})
                except KeyError:
                    self.return_json_fail("Missing parameter, 'entry'")
                except mpd.base.CommandError as e:
                    self.return_json_fail(str(e))

            elif path == "/append":
                self.return_json(
                    {"appended": insert(self.client, post_data, append=True)}
                )

            elif path == "/clear":
                count = len(self.client.playlist())
                self.client.clear()
                self.return_json({"removed": count})

            elif path == "/consume":
                state = post_data.get("enabled", ["1"])

                if state not in ("1", "0"):
                    self.return_json_fail("Parameter, 'enabled', should be '1' or '0'")
                    return

                self.client.consume(state)
                self.return_json({})

            elif path == "/delete":
                len_before = len(self.client.playlist())
                try:
                    pos_from = max(0, post_data["from"])
                    pos_to = min(post_data["to"], len_before)
                except KeyError:
                    self.return_json_fail("Missing parameter 'from' or 'to'")

                self.client.delete((pos_from, pos_to))
                len_after = len(self.client.playlist())
                self.return_json({"removed": len_before - len_after})

            elif path == "/disableoutput" or path == "/enableoutput":
                try:
                    outputid = post_data["outputid"]
                except KeyError:
                    self.return_json_fail("Missing parameter 'outputid'")

                if path == "/enableoutput":
                    self.client.enableoutput(outputid)
                else:
                    self.client.disableoutput(outputid)
                self.return_json({})

            elif path == "/insert":
                self.return_json({"inserted": insert(self.client, post_data)})

            elif path == "/move":
                if not ("from" in post_data and "to" in post_data):
                    self.return_json_fail("Missing parameter")

                self.client.move(post_data["from"], post_data["to"])
                self.return_json({})

            elif path == "/next":
                try:
                    self.client.next()
                    self.return_json({})
                except mpd.base.CommandError as e:
                    self.return_json_fail(str(e))

            elif path == "/pause":
                try:
                    if (
                        self.client.status()["state"] == "stop"
                        and self.client.playlist()
                    ):
                        self.client.play(0)
                    else:
                        self.client.pause()
                    self.return_json({})
                except mpd.base.CommandError as e:
                    self.return_json_fail(str(e))

            elif path == "/play":
                try:
                    play_id = int(post_data["id"])
                    self.client.play(play_id)
                    self.return_json({})
                except ValueError:
                    self.return_json_fail("Invalid parameter, 'id'")

            elif path == "/prev":
                self.client.previous()
                self.return_json({})

            elif path == "/random":
                state = post_data.get("enabled", ["1"])

                if state not in ("1", "0"):
                    self.return_json_fail("Parameter, 'enabled', should be '1' or '0'")
                    return

                self.client.random(state)
                self.return_json({})

            elif path == "/remove":
                removed = 0
                if "ids" in post_data:
                    removed = remove_from_queue_by_id(self.client, post_data["ids"])

                else:
                    for key in ("artist", "albumartist", "album", "title", "name"):
                        if key in post_data:
                            removed += remove_from_queue_by_search(
                                self.client, key, post_data[key]
                            )

                self.return_json({"removed": removed})

            elif path == "/removeplaylist":
                self.client.rm(post_data["playlist"])
                self.return_json({"removed": post_data["playlist"]})

            elif path == "/repeat":
                state = post_data.get("enabled", ["1"])

                if state not in ("1", "0"):
                    self.return_json_fail("Parameter, 'enabled', should be '1' or '0'")
                    return

                self.client.repeat(state)
                self.return_json({})

            elif path == "/save":
                try:
                    name = post_data["name"]
                    self.client.save(name)
                    self.return_json({"saved": name})
                except KeyError:
                    self.return_json_fail("Missing parameter, 'name'")
                except mpd.base.CommandError as e:
                    self.return_json_fail(str(e))

            elif path == "/seek":
                if "time" in post_data:
                    try:
                        new_time = float(post_data["time"])
                        self.client.seekcur(new_time)
                        self.return_json({})
                    except ValueError:
                        self.return_json_fail("Invalid parameter, 'time'")

                elif "percentage" in post_data:
                    try:
                        perc = float(post_data["percentage"])
                        status = self.client.status()
                        new_time = (perc / 100) * float(status["duration"])
                        self.client.seekcur(new_time)
                        self.return_json({})
                    except ValueError:
                        self.return_json_fail("Invalid parameter, 'percentage'")

            elif path == "/shuffle":
                self.client.shuffle()
                self.return_json({})

            elif path == "/single":
                state = post_data.get("enabled", ["1"])

                if state not in ("1", "0"):
                    self.return_json_fail("Parameter, 'enabled', should be '1' or '0'")
                    return

                self.client.single(state)
                self.return_json({})

            elif path == "/stop":
                self.client.stop()
                self.return_json({})

            elif path == "/update":
                self.client.update()
                self.return_json({})

            elif path == "/volume":
                try:
                    if "volume" in post_data:
                        # Adjust relative volume
                        vol = int(post_data["volume"])
                        self.client.volume(vol)

                    elif "setvol" in post_data:
                        # Set new absolute volume
                        vol = int(post_data["setvol"])
                        self.client.setvol(vol)

                    new_volume = self.client.status()["volume"]
                    self.return_json({"volume": new_volume})
                except mpd.base.CommandError as e:
                    self.return_json_fail(str(e))

            else:
                self.return_json_fail(f"Unrecognised POST path: {path}")


if __name__ == "__main__":
    hostname = os.getenv("WEMPD_LISTEN_ADDRESS", "0.0.0.0")
    port = int(os.getenv("WEMPD_LISTEN_PORT", "8010"))
    print(f"Listening on: {hostname}:{port}")
    httpd = http.server.HTTPServer((hostname, port), MPDRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
