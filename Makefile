.PHONY: dev

dev:
	@( \
		tsc -p src --watch & \
		live-server . --ignore="**/*.ts" & \
		wait \
	)