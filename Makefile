.PHONY: all
all: clean install compile

.PHONY: install
install:
	npm install --ignore-scripts

.PHONY: compile
compile:
	npm run compile

.PHONY: clean
clean:
	rm -rf node_modules
	rm -rf out
	rm -rf .vscode

.PHONY: audit
audit:
	npm audit

.PHONY: audit-fix
audit-fix:
	npm audit fix

.PHONY: release
release:
	vsce package
