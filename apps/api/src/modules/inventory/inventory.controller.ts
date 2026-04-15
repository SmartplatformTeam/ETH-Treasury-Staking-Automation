import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../auth/auth.decorators";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@Controller("inventory")
@RequirePermissions("inventory:read")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("validators")
  @ApiOperation({
    summary: "List validator inventory with cluster, signer, and active node bindings."
  })
  @ApiQuery({
    name: "includeArchived",
    required: false,
    type: Boolean,
    description: "When true, includes archived validators in the response."
  })
  listValidators(@Query("includeArchived") includeArchivedRaw?: string) {
    const includeArchived = includeArchivedRaw?.toLowerCase() === "true";

    return this.inventoryService.listValidators({ includeArchived });
  }

  @Get("nodes")
  @ApiOperation({
    summary: "List node inventory across execution, consensus, validator, charon, and signer roles."
  })
  listNodes() {
    return this.inventoryService.listNodes();
  }

  @Get("clusters")
  @ApiOperation({
    summary: "List DVT cluster inventory with baseline, overlay, and runtime health posture."
  })
  listClusters() {
    return this.inventoryService.listClusters();
  }

  @Get("signers")
  @ApiOperation({
    summary: "List signer inventory bound to Web3Signer endpoints and KMS references."
  })
  listSigners() {
    return this.inventoryService.listSigners();
  }
}
