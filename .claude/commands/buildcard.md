Build new card from CSV file: $ARGUMENTS

1. run `uv run tools/generate_flashcard_audio.py` with the $ARGUMENTS file. Ignore the column in the CSV file that are in Pinyin, English or Meaning in English using --ingore argument.
2. Check and make sure audio files are generated in the path related to $ARGUMENTS (remove the .csv extension)
3. run `uv run tools/update_manifest.py` update the manifest file.
4. Check and make sure the new flashcard is in flashcards/public/data/manifest.json
5. deploy the new flash card to the server by run `./deploy.sh`
6. Using playwright to open https://flashcards.jpimobile.com and check if the new flashcards appeared
