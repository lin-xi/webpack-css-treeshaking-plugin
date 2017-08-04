publish:
	npm run build
	git add --all
	git commit -m "update"
	git push origin master
	npm publish --registry https://registry.npmjs.org