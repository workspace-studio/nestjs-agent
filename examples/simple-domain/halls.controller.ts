import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HallsService } from './halls.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('Halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new hall' })
  @ApiResponse({ status: 201, description: 'Hall created successfully' })
  @ApiResponse({ status: 409, description: 'Hall with this name already exists' })
  create(@Body() createHallDto: CreateHallDto, @User() user: any) {
    return this.hallsService.create(createHallDto, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all halls' })
  @ApiResponse({ status: 200, description: 'List of halls' })
  findAll(@Query() query: PaginationQueryDto, @User() user: any) {
    return this.hallsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hall by ID' })
  @ApiResponse({ status: 200, description: 'Hall found' })
  @ApiResponse({ status: 404, description: 'Hall not found' })
  findOne(@Param('id') id: string, @User() user: any) {
    return this.hallsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a hall' })
  @ApiResponse({ status: 200, description: 'Hall updated successfully' })
  @ApiResponse({ status: 404, description: 'Hall not found' })
  update(
    @Param('id') id: string,
    @Body() updateHallDto: UpdateHallDto,
    @User() user: any,
  ) {
    return this.hallsService.update(id, updateHallDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a hall' })
  @ApiResponse({ status: 204, description: 'Hall deleted successfully' })
  @ApiResponse({ status: 404, description: 'Hall not found' })
  remove(@Param('id') id: string, @User() user: any) {
    return this.hallsService.remove(id, user.tenantId);
  }
}
