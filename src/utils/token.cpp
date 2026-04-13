#include "utils/token.hpp"

#include <iomanip>
#include <random>
#include <sstream>

namespace duckdb {

std::string GenerateToken() {
	std::random_device rd;
	std::mt19937_64 gen(rd());
	std::uniform_int_distribution<uint64_t> dist;

	std::ostringstream oss;
	oss << std::hex << std::setfill('0');
	for (int i = 0; i < 4; ++i) {
		oss << std::setw(16) << dist(gen);
	}
	return oss.str();
}

} // namespace duckdb
