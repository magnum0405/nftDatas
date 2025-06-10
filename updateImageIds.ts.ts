import { nftDatas, NftData } from "./nftDatas";
import * as fs from "fs";
import fetch from "node-fetch";

interface IPFSMetadata {
  name: string;
  image: string;
}

async function fetchIPFSMetadata(hash: string): Promise<IPFSMetadata | null> {
  try {
    const response = await fetch(`https://ipfs.io/ipfs/${hash}`);
    if (!response.ok) {
      console.error(
        `Failed to fetch metadata for ${hash}: ${response.statusText}`
      );
      return null;
    }
    const metadata = (await response.json()) as IPFSMetadata;
    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${hash}:`, error);
    return null;
  }
}

function extractImageHash(imageUrl: string): string {
  // Extract hash from "ipfs://bafkreibhwm4bhh7pbzuvkifnayrleuibxl7jg3uu2uker5gcr4fpyiadcu"
  return imageUrl.replace("ipfs://", "");
}

async function updateNftImageIds(): Promise<NftData[]> {
  const updatedNftDatas: NftData[] = [];

  console.log(`Starting to update ${nftDatas.length} NFT image IDs...`);

  for (let i = 0; i < nftDatas.length; i++) {
    const nft = nftDatas[i];
    console.log(`Processing NFT ${nft.id} (${i + 1}/${nftDatas.length})...`);

    // Fetch metadata from current imageId
    const metadata = await fetchIPFSMetadata(nft.imageId);

    if (metadata && metadata.image) {
      // Extract the real image hash
      const realImageHash = extractImageHash(metadata.image);

      // Create updated NFT object
      const updatedNft: NftData = {
        ...nft,
        imageId: realImageHash,
      };

      updatedNftDatas.push(updatedNft);
      console.log(`✓ Updated NFT ${nft.id}: ${nft.imageId} → ${realImageHash}`);
    } else {
      // Keep original if fetch failed
      updatedNftDatas.push(nft);
      console.log(`✗ Failed to update NFT ${nft.id}, keeping original imageId`);
    }

    // Add small delay to avoid overwhelming IPFS gateway
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return updatedNftDatas;
}

async function saveUpdatedData(updatedData: NftData[]): Promise<void> {
  const fileContent = `interface NftAttribute {
  type: string;
  value: string;
  rarity: number;
}

export interface NftData {
  id: number;
  imageId: string;
  rarity: number;
  attributes: NftAttribute[];
  percentage: number;
}

export const nftDatas: NftData[] = ${JSON.stringify(updatedData, null, 2)};
`;

  try {
    fs.writeFileSync("nftDatas-updated.ts", fileContent);
    console.log("✓ Updated data saved to nftDatas-updated.ts");
  } catch (error) {
    console.error("Error saving updated data:", error);
  }
}

// Main execution
async function main() {
  try {
    console.log("Starting NFT imageId update process...");
    const updatedData = await updateNftImageIds();

    console.log("\n=== Update Summary ===");
    console.log(`Total NFTs processed: ${updatedData.length}`);

    // Save to new file
    await saveUpdatedData(updatedData);

    // Optional: Show first few examples of changes
    console.log("\n=== First 3 Examples ===");
    for (let i = 0; i < Math.min(3, updatedData.length); i++) {
      const original = nftDatas[i];
      const updated = updatedData[i];
      console.log(`NFT ${updated.id}:`);
      console.log(`  Original: ${original.imageId}`);
      console.log(`  Updated:  ${updated.imageId}`);
      console.log("");
    }

    console.log("Process completed successfully!");
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

// Run the script
main();
