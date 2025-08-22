## AIRecruitingAgent

### Sync changes from v0-dev branch → main/BrowserExtension/

git checkout main

git pull

git subtree pull --prefix=BrowserExtension origin v0-dev-fixsync --squash -m “v0.dev pull”

git push


### Sync changes from main/BrowserExtension/ → v0-dev branch

git checkout main

git pull

git add BrowserExtension 

git commit -m "Update BrowserExtension"

git subtree push --prefix=BrowserExtension origin v0-dev