'use strict';

const axios = require('axios');

const API_URL = process.env.TEST_API_URL || 'https://charityai-backend.onrender.com/api';

/**
 * Thin axios wrapper for direct API calls in unit/API tests.
 * Returns { status, data, headers } or throws with { response }.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  validateStatus: () => true, // never throw on HTTP error codes
});

/**
 * Performs a GET request.
 */
async function get(path, headers = {}) {
  return api.get(path, { headers });
}

/**
 * Performs a POST request with a JSON body.
 */
async function post(path, body = {}, headers = {}) {
  return api.post(path, body, { headers });
}

/**
 * Performs a PUT request with a JSON body.
 */
async function put(path, body = {}, headers = {}) {
  return api.put(path, body, { headers });
}

/**
 * Builds an Authorization Bearer header object.
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { get, post, put, authHeader, API_URL };
