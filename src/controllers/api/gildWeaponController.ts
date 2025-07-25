import { RequestHandler } from "express";
import { getAccountIdForRequest } from "@/src/services/loginService";
import { sendWsBroadcastTo } from "@/src/services/wsService";
import { getJSONfromString } from "@/src/helpers/stringHelpers";
import { addMiscItems, getInventory } from "@/src/services/inventoryService";
import { TEquipmentKey } from "@/src/types/inventoryTypes/inventoryTypes";
import { ArtifactPolarity } from "@/src/types/inventoryTypes/commonInventoryTypes";
import { ExportRecipes } from "warframe-public-export-plus";
import { IInventoryChanges } from "@/src/types/purchaseTypes";
import { EquipmentFeatures, IEquipmentClient } from "@/src/types/equipmentTypes";

interface IGildWeaponRequest {
    ItemName: string;
    Recipe: string; // e.g. /Lotus/Weapons/SolarisUnited/LotusGildKitgunBlueprint
    PolarizeSlot?: number;
    PolarizeValue?: ArtifactPolarity;
    ItemId: string;
    Category: TEquipmentKey;
}

export const gildWeaponController: RequestHandler = async (req, res) => {
    const accountId = await getAccountIdForRequest(req);
    const data = getJSONfromString<IGildWeaponRequest>(String(req.body));
    data.ItemId = String(req.query.ItemId);
    data.Category = req.query.Category as TEquipmentKey;

    const inventory = await getInventory(accountId);
    const weaponIndex = inventory[data.Category].findIndex(x => String(x._id) === data.ItemId);
    if (weaponIndex === -1) {
        throw new Error(`Weapon with ${data.ItemId} not found in category ${String(req.query.Category)}`);
    }

    const weapon = inventory[data.Category][weaponIndex];
    weapon.Features ??= 0;
    weapon.Features |= EquipmentFeatures.GILDED;
    if (data.Recipe != "webui") {
        weapon.ItemName = data.ItemName;
        weapon.XP = 0;
    }
    if (data.Category != "OperatorAmps" && data.PolarizeSlot && data.PolarizeValue) {
        weapon.Polarity = [
            {
                Slot: data.PolarizeSlot,
                Value: data.PolarizeValue
            }
        ];
    }
    inventory[data.Category][weaponIndex] = weapon;
    const inventoryChanges: IInventoryChanges = {};
    inventoryChanges[data.Category] = [weapon.toJSON<IEquipmentClient>()];

    const affiliationMods = [];

    if (data.Recipe != "webui") {
        const recipe = ExportRecipes[data.Recipe];
        inventoryChanges.MiscItems = recipe.secretIngredients!.map(ingredient => ({
            ItemType: ingredient.ItemType,
            ItemCount: ingredient.ItemCount * -1
        }));
        addMiscItems(inventory, inventoryChanges.MiscItems);

        if (recipe.syndicateStandingChange) {
            const affiliation = inventory.Affiliations.find(x => x.Tag == recipe.syndicateStandingChange!.tag)!;
            affiliation.Standing += recipe.syndicateStandingChange.value;
            affiliationMods.push({
                Tag: recipe.syndicateStandingChange.tag,
                Standing: recipe.syndicateStandingChange.value
            });
        }
    }

    await inventory.save();
    res.json({
        InventoryChanges: inventoryChanges,
        AffiliationMods: affiliationMods
    });
    sendWsBroadcastTo(accountId, { update_inventory: true });
};
