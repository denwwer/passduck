.PHONY: zip convert

# Chrome bundle
zip:
	@rm -rf passduck.zip
	@cd src && zip -r ../passduck.zip .

# Convert to Safari
# xcrun required full Xcode installation and sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
convert:
	@bash convert.sh
