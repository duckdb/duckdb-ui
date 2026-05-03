#include "utils/encoding.hpp"

#include <vector>
#include <cstdint>

namespace duckdb {

// Copied from
// https://www.mycplus.com/source-code/c-source-code/base64-encode-decode/
constexpr char k_encoding_table[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+_";

std::vector<char> BuildDecodingTable() {
  std::vector<char> decoding_table;
  decoding_table.resize(256);
  for (int i = 0; i < 64; ++i) {
    decoding_table[static_cast<unsigned char>(k_encoding_table[i])] = i;
  }
  return decoding_table;
}

const static std::vector<char> k_decoding_table = BuildDecodingTable();

std::string DecodeBase64(const std::string &data) {
  size_t input_length = data.size();
  if (input_length < 4 || input_length % 4 != 0) {
    // Handle this exception
    return "";
  }

  size_t output_length = input_length / 4 * 3;
  if (data[input_length - 1] == '=') {
    output_length--;
  }
  if (data[input_length - 2] == '=') {
    output_length--;
  }

  std::string decoded_data;
  decoded_data.resize(output_length);
  for (size_t i = 0, j = 0; i < input_length;) {
    uint32_t sextet_a = data[i] == '=' ? 0 & i++ : k_decoding_table[static_cast<unsigned char>(data[i++])];
    uint32_t sextet_b = data[i] == '=' ? 0 & i++ : k_decoding_table[static_cast<unsigned char>(data[i++])];
    uint32_t sextet_c = data[i] == '=' ? 0 & i++ : k_decoding_table[static_cast<unsigned char>(data[i++])];
    uint32_t sextet_d = data[i] == '=' ? 0 & i++ : k_decoding_table[static_cast<unsigned char>(data[i++])];

    uint32_t triple = (sextet_a << 3 * 6) + (sextet_b << 2 * 6) +
                      (sextet_c << 1 * 6) + (sextet_d << 0 * 6);

    if (j < output_length) {
      decoded_data[j++] = (triple >> 2 * 8) & 0xFF;
    }
    if (j < output_length) {
      decoded_data[j++] = (triple >> 1 * 8) & 0xFF;
    }
    if (j < output_length) {
      decoded_data[j++] = (triple >> 0 * 8) & 0xFF;
    }
  }

  return decoded_data;
}

} // namespace duckdb
