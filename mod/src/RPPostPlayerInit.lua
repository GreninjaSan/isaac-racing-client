local RPPostPlayerInit = {}

-- ModCallbacks.MC_POST_PLAYER_INIT (9)
-- (this will get called before the "PostGameStarted" callback)
function RPPostPlayerInit:Main(player)
  -- Local variables
  local game = Game()
  local mainPlayer = game:GetPlayer(0)
  local character = mainPlayer:GetPlayerType()
  local sfx = SFXManager()

  Isaac.DebugString("MC_POST_PLAYER_INIT")

  if player.Variant == 0 then
    -- With Eve, Eden, and Keeper, the beginning of the recharge sound will play, which is annoying
    if character == PlayerType.PLAYER_EVE or -- 5
       character == PlayerType.PLAYER_EDEN or -- 9
       character == PlayerType.PLAYER_KEEPER then -- 14

      -- Adding the D6 is necessary because these characters have not been given their active item yet;
      -- the recharge sounds happens somewhere between this callback and the PostGameStarted callback
      -- (if the active item is already charged, there won't be a 2nd recharge sound when a new item is added)
      player:AddCollectible(CollectibleType.COLLECTIBLE_D6, 6, false) -- 105
      sfx:Stop(SoundEffect.SOUND_BATTERYCHARGE) -- 170
    end
    return
  end

  -- A co-op baby spawned; first, check for the True Co-op mod
  if InfinityTrueCoopInterface then -- luacheck: ignore
    return
  end

  -- Co-op babies are disallowed in Racing+ because of certain exploits (stealing devil deal items and so forth)
  mainPlayer:AnimateSad() -- Play a sound effect to communicate that the player made a mistake
  player:Kill() -- This kills the co-op baby, but the main character will still get their health back for some reason

  -- Since the player gets their health back, it is still possible to steal devil deals, so remove all unpurchased
  -- Devil Room items in the room (which will have prices of either -1 or -2)
  for i, entity in pairs(Isaac.GetRoomEntities()) do
    if entity.Type == EntityType.ENTITY_PICKUP and -- If this is a pedestal item (5.100)
       entity.Variant == PickupVariant.PICKUP_COLLECTIBLE and
       entity:ToPickup().Price < 0 then

      entity:Remove()
    end
  end
end

return RPPostPlayerInit
