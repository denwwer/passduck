.PHONY: zip convert landing

# Chrome bundle
zip:
	@rm -rf passduck.zip
	@cd src && zip -r ../passduck.zip .

# Convert to Safari
# xcrun required full Xcode installation and sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
convert:
	@bash convert.sh

# Build landing page
landing:
	@rm -rf ".parcel-cache" dist docs
	@mkdir docs
	npm run build
	@cp -r dist/* docs/
	@git add docs/.
