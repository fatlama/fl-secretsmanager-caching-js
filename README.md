# fl-secretsmanager-caching

Provides a caching layer for AWS Secrets Manager

## Getting Started

* To just run tests: `yarn test`
* To format the code using prettier: `yarn format`
* To run the entire build process: `yarn release`

## Publishing to NPM

Use the built-in `npm version {patch|minor}` tool to increment the version number and trigger a release

```
# patch: 1.0.0 -> 1.0.1
$ npm version patch
$ git push origin master --tag
```

CircleCI will listen for tags matching vX.Y.Z and then will prompt you to confirm the release