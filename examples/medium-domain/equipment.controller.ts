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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { Roles } from 'src/modules/common/decorators/roles.decorator';
import { User } from 'src/modules/common/decorators/user.decorator';
import { Role } from 'src/modules/common/enums/role.enum';
import { EquipmentStatus } from './dto/create-equipment.dto';

@ApiTags('Equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new equipment' })
  @ApiResponse({ status: 201, description: 'Equipment created successfully' })
  create(@Body() createEquipmentDto: CreateEquipmentDto, @User() user: any) {
    return this.equipmentService.create(createEquipmentDto, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all equipment' })
  @ApiResponse({ status: 200, description: 'List of equipment' })
  @ApiQuery({ name: 'pageNumber', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: EquipmentStatus })
  @ApiQuery({ name: 'hallId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('pageNumber') pageNumber: number = 0,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: EquipmentStatus,
    @Query('hallId') hallId?: string,
    @Query('search') search?: string,
    @User() user?: any,
  ) {
    return this.equipmentService.findAll(user.tenantId, {
      pageNumber,
      pageSize,
      status,
      hallId,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiResponse({ status: 200, description: 'Equipment found' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  findOne(@Param('id') id: string, @User() user: any) {
    return this.equipmentService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update equipment' })
  @ApiResponse({ status: 200, description: 'Equipment updated successfully' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  update(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
    @User() user: any,
  ) {
    return this.equipmentService.update(id, updateEquipmentDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete equipment' })
  @ApiResponse({ status: 204, description: 'Equipment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  remove(@Param('id') id: string, @User() user: any) {
    return this.equipmentService.remove(id, user.tenantId);
  }
}
