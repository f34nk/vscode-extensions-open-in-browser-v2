.PHONY: all
all: clean install compile audit test

.PHONY: install
install:
	#
	# Install
	# 
	npm install --ignore-scripts

.PHONY: compile
compile:
	#
	# Compile
	# 
	npm run compile

.PHONY: test
test:
	#
	# Test
	# 
	npm test

.PHONY: clean
clean:
	#
	# Clean
	# 
	rm -rf node_modules
	rm -rf out
	rm -rf .vscode

.PHONY: audit
audit:
	#
	# Audit
	# 
	npm audit

.PHONY: audit-fix
audit-fix:
	#
	# Audit Fix
	# 
	npm audit fix

.PHONY: release
release:
	#
	# Release
	# 
	npx vsce package
