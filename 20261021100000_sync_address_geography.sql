-- VemGO: sincroniza coordenadas de endereços com a coluna geográfica.
-- Preparada localmente; revisar contra o schema real antes de aplicar em qualquer banco.

CREATE OR REPLACE FUNCTION public.sync_address_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.location := NULL;
  ELSE
    IF NEW.latitude < -90 OR NEW.latitude > 90
       OR NEW.longitude < -180 OR NEW.longitude > 180 THEN
      RAISE EXCEPTION 'Coordenadas de endereço fora dos limites válidos'
        USING ERRCODE = '22023';
    END IF;

    NEW.location := gis.ST_SetSRID(
      gis.ST_MakePoint(NEW.longitude, NEW.latitude),
      4326
    )::gis.geography;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS addresses_sync_location ON public.addresses;

CREATE TRIGGER addresses_sync_location
BEFORE INSERT OR UPDATE OF latitude, longitude, location
ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.sync_address_location();

-- Backfill não destrutivo: preenche location apenas onde as duas coordenadas
-- já existem. Endereços sem GPS continuam sem coordenadas.
UPDATE public.addresses
SET location = gis.ST_SetSRID(
  gis.ST_MakePoint(longitude, latitude),
  4326
)::gis.geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;
