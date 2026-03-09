async function loadAgeCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/webapp/age_categories`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api_key': API_KEY
            }
        });
        if (response.ok) {
            const categories = await response.json();
            localStorage.setItem('ageCategories', JSON.stringify(categories));
            return categories;
        } else {
            console.error('Failed to load age categories:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error loading age categories:', error);
        return null;
    }
}

async function createUser(ageCategoryUuid, questionsAmount) {
    const userUuid = localStorage.getItem('user_id');
    const operatingSystem = getOperatingSystem();
    const browser = getBrowser();

    try {
        const response = await fetch(`${API_BASE_URL}/webapp/create_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_key': API_KEY
            },
            body: JSON.stringify({
                user_uuid: userUuid,
                operating_system: operatingSystem,
                browser: browser,
                age_category_uuid: ageCategoryUuid,
                questions_amount: questionsAmount
            })
        });
        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            console.error('Failed to create user:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}

async function createStatistics(sceneUuid, station = null, points = null) {
    const userUuid = localStorage.getItem('user_id');

    try {
        const body = {
            user_uuid: userUuid,
            scene_uuid: sceneUuid
        };
        if (station !== null) body.station = station;
        if (points !== null) body.points = points;

        const response = await fetch(`${API_BASE_URL}/webapp/create_statistics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_key': API_KEY
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            console.error('Failed to create statistics:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error creating statistics:', error);
        return null;
    }
}
async function activateUnauth(sceneUuid) {
    const userUuid = localStorage.getItem('user_id');
    const operatingSystem = getOperatingSystem();

    try {
        const url = `${API_BASE_URL}/service-ar/activate_unauth?scenes_uuid=${sceneUuid}&user_uuid=${userUuid}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_key': API_KEY
            },
            body: JSON.stringify({
                test_mode: false,
                unauth: true,
                operating_system: operatingSystem
            })
        });
        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            console.error('Failed to activate unauth:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error activating unauth:', error);
        return null;
    }
}