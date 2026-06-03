PROJ_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# Configuration of extension
EXT_NAME=ui
EXT_CONFIG=${PROJ_DIR}extension_config.cmake

# Include the Makefile from extension-ci-tools
include extension-ci-tools/makefiles/duckdb_extension.Makefile

# OpenSSL 3.6+ requires Perl core modules (File::Compare, FindBin, ...) at its
# ./Configure step. The linux_amd64 LTS build image ships only perl-IPC-Cmd, so
# building OpenSSL from source fails there with a missing-Perl-module error.
# Install perl-core before the build runs. Guarded so it is a no-op anywhere
# without yum (macOS, Windows) and when OpenSSL is restored from the vcpkg cache.
release debug: | install-build-prereqs

install-build-prereqs:
	@command -v yum >/dev/null 2>&1 && yum install -y perl-core || true
