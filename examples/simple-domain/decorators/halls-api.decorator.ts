import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

export function CreateHallApi() {
  return applyDecorators(
    HttpCode(HttpStatus.CREATED),
    Roles(Role.ADMIN),
    ApiOperation({ summary: 'Create a new hall' }),
    ApiResponse({ status: 201, description: 'Hall created successfully' }),
    ApiResponse({ status: 409, description: 'Hall with this name already exists' }),
  );
}

export function GetHallsApi() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all halls' }),
    ApiResponse({ status: 200, description: 'List of halls' }),
  );
}

export function GetHallApi() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a hall by ID' }),
    ApiResponse({ status: 200, description: 'Hall found' }),
    ApiResponse({ status: 404, description: 'Hall not found' }),
  );
}

export function UpdateHallApi() {
  return applyDecorators(
    Roles(Role.ADMIN),
    ApiOperation({ summary: 'Update a hall' }),
    ApiResponse({ status: 200, description: 'Hall updated successfully' }),
    ApiResponse({ status: 404, description: 'Hall not found' }),
  );
}

export function DeleteHallApi() {
  return applyDecorators(
    HttpCode(HttpStatus.NO_CONTENT),
    Roles(Role.ADMIN),
    ApiOperation({ summary: 'Delete a hall' }),
    ApiResponse({ status: 204, description: 'Hall deleted successfully' }),
    ApiResponse({ status: 404, description: 'Hall not found' }),
  );
}
