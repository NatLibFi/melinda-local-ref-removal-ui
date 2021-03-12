import {readEnvironmentVariable} from '@natlibfi/melinda-backend-commons';

export const restApiUrl = readEnvironmentVariable('REST_API_URL');
export const restApiUsername = readEnvironmentVariable('REST_API_USERNAME');
export const restApiPassword = readEnvironmentVariable('REST_API_PASSWORD');