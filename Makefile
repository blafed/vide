.PHONY: dev

dev:
	@( \
		tsc --watch & \
		live-server --ignore="**/*.ts" & \
		wait \
	)