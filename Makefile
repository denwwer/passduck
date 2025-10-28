.PHONY: zip

zip:
	@rm -rf passduck.zip
	@cd src && zip -r ../passduck.zip .
