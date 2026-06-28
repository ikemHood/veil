import { INTERESTS, PROVINCES_AND_DISTRICTS, UNIVERSITIES } from "@/lib/constants";

export const getInterestById = (interestId: number) => {
	return INTERESTS.find((interest) => interest.id === interestId)?.name;
};

export const getUniversityById = (universityId: number) => {
	return UNIVERSITIES.find((university) => university.id === universityId)?.name;
};

export const PROVINCES = PROVINCES_AND_DISTRICTS.map((province) => {
	return {
		provinceId: province.id,
		name: province.name,
	};
});

export const DISTRICTS = PROVINCES_AND_DISTRICTS.flatMap((province) =>
	province.districts.map((district) => {
		return {
			districtId: district.id,
			name: district.name,
		};
	}),
);

export const getProvinceById = (provinceId: number) => {
	return PROVINCES.find((province) => province.provinceId === provinceId)?.name;
};

export const getDistrictById = (districtId: number) => {
	return DISTRICTS.find((district) => district.districtId === districtId)?.name;
};

export const getDistrictsByProvinceId = (provinceId: number) => {
	return PROVINCES_AND_DISTRICTS.find((province) => province.id === provinceId)?.districts.map(
		(district) => {
			return {
				districtId: district.id,
				name: district.name,
			};
		},
	);
};
