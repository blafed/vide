.PHONY: dev

dev:
	@( \
		tsc -p src --watch & \
		live-server public --ignore="**/*.ts" & \
		wait \
	)