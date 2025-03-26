UPDATE changelog to include changes between given tag/commit and latest tag.
Make sure we follow reverse chronological order. Each tag should be their own h2
header and under the tag, we list the changes made since given tag. If there is
no given tag, consider the changelog against the latest master commit. And keep
them under `Unreleased` h2 header.

Under each h2 header, we can have the following sections:

```md
## [Unreleased OR tag]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

UPDATE readme to reflect those changes for the first time visitor.
