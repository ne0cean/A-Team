#!/bin/bash
/usr/local/bin/meilisearch --db-path /Users/noir/Projects/a-team/.meili_data --http-addr 127.0.0.1:7700 --no-analytics >> /tmp/meilisearch.log 2>> /tmp/meilisearch.err &
echo $! > /tmp/meilisearch.pid
