## Instructions for syncing with v0.dev 

The chrome extension was originally vibe-coded using v0.dev, but has since been heavily modified. To keep the two repos in sync, use the following instructions.

### Sync changes from main/BrowserExtension/ → v0-dev branch

1. git checkout main 

2. git pull

3. git add BrowserExtension 

4. git commit -m "Update BrowserExtension"

5. git subtree push --prefix=BrowserExtension origin v0-dev


### Sync changes from v0-dev branch → main/BrowserExtension/

1. git checkout main

2. git pull

3. git subtree pull --prefix=BrowserExtension origin v0-dev-fixsync --squash -m “v0.dev pull”

4. git push


