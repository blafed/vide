.PHONY: dev

dev:
	@( \
		tsc --watch & \
		live-server public --ignore="**/*.ts" & \
		wait \
	)